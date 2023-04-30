export interface Env {
    NUXT_TURNSTILE_SECRET_KEY: string
}

async function handlePost(request: Request, SECRET_KEY: string) {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "http://localhost:3000",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Max-Age": "86400",
    };
    const body = JSON.parse(JSON.stringify(await request.json()))
    // Turnstile injects a token in "cf-turnstile-response".
    const token = body.token
    const ip = request.headers.get('CF-Connecting-IP');

    // Validate the token by calling the "/siteverify" API.
    let formData = new FormData();
    formData.append('secret', SECRET_KEY);
    formData.append('response', token!);
    formData.append('remoteip', ip!);

    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        body: formData,
        method: 'POST',
    });

    const outcome: any = await result.json();
    if (!outcome.success) {
        return new Response(JSON.stringify(outcome),{
            headers: {
                ...corsHeaders
            }
        });
    }
    // The Turnstile token was successfuly validated. Proceed with your application logic.
    // Validate login, redirect user, etc.
    // For this demo, we just echo the "/siteverify" response:
    return new Response(JSON.stringify(outcome),{
        headers: {
            ...corsHeaders
        }
    });
}

async function handleOptions(request: Request) {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "http://localhost:3000",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Max-Age": "86400",
    };
    if (
        request.headers.get("Origin") !== null &&
        request.headers.get("Access-Control-Request-Method") !== null &&
        request.headers.get("Access-Control-Request-Headers") !== null
    ) {
        const headers = request.headers.get("Access-Control-Request-Headers")
        // Handle CORS preflight requests.
        if (headers) {
            return new Response(null, {
                headers: {
                    ...corsHeaders,
                    "Access-Control-Allow-Headers": headers
                },
            });
        }
        return new Response(null, {
            headers: {
                ...corsHeaders,
                "Access-Control-Allow-Headers": ""
            },
        });
    } else {
        // Handle standard OPTIONS request.
        return new Response(null, {
            headers: {
                Allow: "POST, OPTIONS",
            },
        });
    }
}

// @ts-ignore
const handler: ExportedHandler = {
    // @ts-ignore "STUPID ERROR"
    async fetch(request, env: Env) {

        if (request.method === 'POST') {
            return await handlePost(request, env.NUXT_TURNSTILE_SECRET_KEY);
        } else if (request.method === "OPTIONS") {
            // Handle CORS preflight requests
            return handleOptions(request);
        }
        return new Response(new Blob(), {
            status: 401, statusText: "Method not allowed"
        })
    },
};

export default handler;