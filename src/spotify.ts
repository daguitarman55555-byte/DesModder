const CLIENT_ID = "4052ea1384df4eb9a35141159c5a328e";
const TOKEN_KEY = "audio-lab-spotify-token";
const SCOPES = [
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
];

interface StoredToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

function randomBase64Url(length = 64) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function sha256Base64Url(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function saveToken(response: TokenResponse, previousRefresh = "") {
  const token: StoredToken = {
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? previousRefresh,
    expiresAt: Date.now() + response.expires_in * 1000 - 60_000,
  };
  await chrome.storage.local.set({ [TOKEN_KEY]: token });
  return token;
}

async function tokenRequest(body: URLSearchParams) {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok)
    throw new Error(`Spotify authorization failed (${response.status}).`);
  return (await response.json()) as TokenResponse;
}

async function storedToken() {
  const result = await chrome.storage.local.get(TOKEN_KEY);
  return result[TOKEN_KEY] as StoredToken | undefined;
}

async function accessToken() {
  const token = await storedToken();
  if (token === undefined) throw new Error("Sign in to Spotify first.");
  if (Date.now() < token.expiresAt) return token.accessToken;
  if (token.refreshToken === "") throw new Error("Spotify sign-in expired.");
  const refreshed = await tokenRequest(
    new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    })
  );
  return (await saveToken(refreshed, token.refreshToken)).accessToken;
}

async function spotifyFetch(path: string, init: RequestInit = {}) {
  const token = await accessToken();
  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  if (response.status === 401) {
    await chrome.storage.local.remove(TOKEN_KEY);
    throw new Error("Spotify sign-in expired. Sign in again.");
  }
  return response;
}

export async function spotifySignIn() {
  if (BROWSER !== "chrome")
    throw new Error("Spotify sign-in is currently available in Chrome only.");
  const verifier = randomBase64Url();
  const challenge = await sha256Base64Url(verifier);
  const state = randomBase64Url(24);
  const redirectUri = chrome.identity.getRedirectURL("spotify");
  const authorization = new URL("https://accounts.spotify.com/authorize");
  authorization.search = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
  }).toString();
  const redirected = await chrome.identity.launchWebAuthFlow({
    url: authorization.toString(),
    interactive: true,
  });
  if (redirected === undefined)
    throw new Error("Spotify sign-in was cancelled.");
  const result = new URL(redirected);
  if (result.searchParams.get("state") !== state)
    throw new Error("Spotify sign-in state did not match.");
  const spotifyError = result.searchParams.get("error");
  if (spotifyError !== null)
    throw new Error(`Spotify sign-in failed: ${spotifyError}.`);
  const code = result.searchParams.get("code");
  if (code === null)
    throw new Error("Spotify did not return an authorization code.");
  const response = await tokenRequest(
    new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    })
  );
  await saveToken(response);
  return await spotifyProfile();
}

export async function spotifyProfile() {
  const response = await spotifyFetch("/me");
  if (!response.ok)
    throw new Error(`Spotify profile request failed (${response.status}).`);
  const profile = (await response.json()) as {
    display_name?: string;
    id: string;
  };
  return { name: profile.display_name ?? profile.id };
}

export async function spotifyPlay(uri: string) {
  if (!/^spotify:(track|album|playlist|episode|show):[A-Za-z0-9]+$/.test(uri))
    throw new Error("That Spotify link is not supported.");
  const response = await spotifyFetch("/me/player/play", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      uri.startsWith("spotify:track:") || uri.startsWith("spotify:episode:")
        ? { uris: [uri] }
        : { context_uri: uri }
    ),
  });
  if (response.status === 404)
    throw new Error(
      "No active Spotify player. Start Spotify in a tab or app, then retry."
    );
  if (!response.ok)
    throw new Error(`Spotify could not start playback (${response.status}).`);
}

async function playerCommand(path: string, method: "POST" | "PUT") {
  const response = await spotifyFetch(`/me/player/${path}`, { method });
  if (response.status === 404)
    throw new Error(
      "No active Spotify player. Open Spotify and play anything once, then retry."
    );
  if (!response.ok)
    throw new Error(`Spotify playback command failed (${response.status}).`);
}

export async function spotifyPause() {
  await playerCommand("pause", "PUT");
}

export async function spotifyResume() {
  await playerCommand("play", "PUT");
}

export async function spotifyNext() {
  await playerCommand("next", "POST");
}

export async function spotifyPrevious() {
  await playerCommand("previous", "POST");
}

interface PlaybackResponse {
  is_playing: boolean;
  progress_ms?: number;
  item?: {
    name: string;
    duration_ms: number;
    uri: string;
    artists?: Array<{ name: string }>;
  };
  device?: { name: string };
}

export async function spotifyPlaybackState() {
  const response = await spotifyFetch("/me/player");
  if (response.status === 204) return { active: false } as const;
  if (!response.ok)
    throw new Error(`Spotify playback state failed (${response.status}).`);
  const state = (await response.json()) as PlaybackResponse;
  return {
    active: true,
    isPlaying: state.is_playing,
    progressMs: state.progress_ms ?? 0,
    durationMs: state.item?.duration_ms ?? 0,
    track: state.item?.name ?? "Unknown track",
    artist: state.item?.artists?.map((artist) => artist.name).join(", ") ?? "",
    uri: state.item?.uri ?? "",
    device: state.device?.name ?? "Spotify",
  } as const;
}

export async function spotifyOpen() {
  await chrome.tabs.create({ url: "https://open.spotify.com/" });
}

export async function spotifySignOut() {
  await chrome.storage.local.remove(TOKEN_KEY);
}

export async function spotifyIsSignedIn() {
  try {
    return await spotifyProfile();
  } catch {
    return undefined;
  }
}
