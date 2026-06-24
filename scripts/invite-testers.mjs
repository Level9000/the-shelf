// One-off script: invite testers to production via Supabase Auth.
// Sends each address a real invite email — they set their own password,
// then land on https://authoredby.app/login.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... node scripts/invite-testers.mjs
//
// Reads both env vars from .env if present (via dotenv) — or export them
// from your shell before running. Requires the *service role* key, not the
// anon key, since admin.inviteUserByEmail needs elevated privileges.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

function loadEnvFile(path) {
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
      }
    }
  } catch {
    // file not found — fine, env may already be set
  }
}

loadEnvFile(new URL("../.env", import.meta.url));
loadEnvFile(new URL("../.env.local", import.meta.url));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const TESTER_EMAILS = [
  "erik@greenarmy.ai",
  "bryan@greenarmy.ai",
];

const REDIRECT_TO = "https://authoredby.app/login";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

for (const email of TESTER_EMAILS) {
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: REDIRECT_TO,
  });

  if (error) {
    console.error(`✗ ${email}: ${error.message}`);
    continue;
  }

  console.log(`✓ ${email} invited (user id: ${data.user.id})`);
}
