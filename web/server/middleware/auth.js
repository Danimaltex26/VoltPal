import { createClient } from "@supabase/supabase-js";

const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseApp = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "voltpal" } }
);

export default async function auth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or malformed Authorization header" });
    }

    const token = header.replace("Bearer ", "");

    const {
      data: { user },
      error,
    } = await supabaseAuth.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = user;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      req.profile = { id: user.id, subscription_tier: "free" };
    } else {
      req.profile = profile;
    }

    // Read actual subscription tier from public.subscriptions
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("tier")
      .eq("user_id", user.id)
      .eq("app", "voltpal")
      .maybeSingle();

    req.profile.subscription_tier = sub?.tier || "free";

    // Team-tier override: if user is on an active team, grant Pro
    if (req.profile.team_id && req.profile.subscription_tier === "free") {
      const { data: team } = await supabase
        .from("teams")
        .select("subscription_status")
        .eq("id", req.profile.team_id)
        .maybeSingle();

      if (team?.subscription_status === "active") {
        req.profile.subscription_tier = "pro";
        req.profile.team_subscription = true;
      }
    }

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({ error: "Authentication failed" });
  }
}
