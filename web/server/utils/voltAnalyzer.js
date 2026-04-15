/**
 * VoltPal Photo Analyzer — API Call Handler
 *
 * Wraps the Anthropic API call with:
 * - Correct model selection (always Sonnet for photo diagnosis)
 * - Structured JSON parsing and validation
 * - Retry logic for transient API errors
 * - Usage logging to Supabase ai_usage_log
 * - Consistent error format for route handlers
 *
 * USAGE in route handler:
 *   import { analyzeElectricalPhoto } from '../utils/voltAnalyzer.js';
 *
 *   const { analysis, usage } = await analyzeElectricalPhoto({
 *     imageBase64: req.files[0].buffer.toString("base64"),
 *     analysisType: req.body.analysis_type,
 *     voltageClass: req.body.voltage_class,
 *     equipmentType: req.body.equipment_type,
 *     environment: req.body.environment,
 *     userNotes: req.body.user_notes,
 *     userId: req.user.id
 *   });
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { VOLTPAL_SYSTEM_PROMPT, buildVoltAnalysisMessage } from '../prompts/voltAnalysis.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Supabase client for usage logging (public schema, service role)
var supabaseLog = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabaseLog = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

var APP_NAME = process.env.APP_NAME || 'voltpal';

/**
 * Analyzes an electrical equipment photograph using Claude Sonnet vision.
 * Handles panels, motor nameplates, VFDs, wiring, meter readings, and thermal images.
 *
 * @param {object} params - See buildVoltAnalysisMessage for full param list
 * @returns {Promise<{analysis: object, usage: object, model: string}>}
 * @throws {object} Structured error object — check error.type for handling
 */
export async function analyzeElectricalPhoto(params) {
  const {
    imageBase64,
    imageMediaType = 'image/jpeg',
    analysisType,
    voltageClass,
    equipmentType,
    environment,
    userNotes,
    userId
  } = params;

  // Validate required fields before calling API
  if (!imageBase64) {
    throw {
      type: 'validation_error',
      message: 'No image provided',
      userMessage: 'Please attach a photo before submitting.'
    };
  }

  const messages = buildVoltAnalysisMessage({
    imageBase64,
    imageMediaType,
    analysisType,
    voltageClass,
    equipmentType,
    environment,
    userNotes
  });

  // MODEL: claude-sonnet-4-20250514
  // Photo diagnosis always uses Sonnet — vision quality matters here.
  // Haiku is NOT acceptable for photo analysis — see model router strategy.
  // temperature: 0.2 — low for consistent, precise diagnosis
  // max_tokens: 1500 — thorough panel analysis with multiple findings needs room

  let response;
  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    try {
      attempt++;

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        temperature: 0.2,
        system: VOLTPAL_SYSTEM_PROMPT,
        messages: messages
      });

      break; // Success — exit retry loop

    } catch (apiError) {
      const isRetryable = apiError.status === 529 || apiError.status === 500;
      const isLastAttempt = attempt >= maxAttempts;

      if (isRetryable && !isLastAttempt) {
        console.warn(`[VoltPal Analyzer] API attempt ${attempt} failed (${apiError.status}). Retrying in 2s...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      throw {
        type: 'api_error',
        status: apiError.status || 500,
        message: apiError.message || 'Claude API call failed',
        userMessage: apiError.status === 529
          ? 'Analysis service is temporarily busy. Please try again in a moment.'
          : 'Analysis failed. Please check your connection and try again.',
        isOverloaded: apiError.status === 529,
        isRateLimit: apiError.status === 429
      };
    }
  }

  // Parse JSON response
  let analysis;
  const rawText = response.content[0].text.trim();

  try {
    const cleanText = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    analysis = JSON.parse(cleanText);

  } catch (parseError) {
    console.error('[VoltPal Analyzer] JSON parse failed:', rawText);
    throw {
      type: 'parse_error',
      message: 'Analysis response could not be processed',
      userMessage: 'The analysis could not be completed. Please try again.',
      raw: rawText
    };
  }

  // Validate critical fields exist
  if (typeof analysis.is_electrical_image === 'undefined') {
    console.error('[VoltPal Analyzer] Missing is_electrical_image field:', analysis);
    throw {
      type: 'validation_error',
      message: 'Incomplete analysis returned — missing required fields',
      userMessage: 'The analysis was incomplete. Please try again.'
    };
  }

  // Log usage for cost tracking
  const isSonnet = response.model.includes('sonnet');
  const inputCost = (response.usage.input_tokens / 1_000_000) * (isSonnet ? 3.00 : 0.25);
  const outputCost = (response.usage.output_tokens / 1_000_000) * (isSonnet ? 15.00 : 1.25);
  const totalCost = inputCost + outputCost;

  if (process.env.NODE_ENV === 'development' || process.env.TRADEPAL_MODEL_LOGGING === 'true') {
    console.log(
      `[VoltPal Analyzer] ${isSonnet ? 'SONNET' : 'HAIKU'} | ` +
      `in:${response.usage.input_tokens} out:${response.usage.output_tokens} | ` +
      `~$${totalCost.toFixed(5)}`
    );
  }

  // Write to Supabase ai_usage_log (fire-and-forget)
  if (supabaseLog) {
    supabaseLog.from('ai_usage_log').insert({
      app_name: APP_NAME,
      feature: 'photo_diagnosis',
      model: response.model,
      is_sonnet: isSonnet,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      estimated_cost_usd: totalCost,
      user_id: userId || null,
    }).then(function (res) {
      if (res.error) console.error('[VoltPal Analyzer] Usage log error:', res.error.message);
    }).catch(function () {});
  }

  return {
    analysis,
    usage: response.usage,
    model: response.model
  };
}
