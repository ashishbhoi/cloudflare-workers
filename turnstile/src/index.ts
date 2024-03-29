export interface Environment {
    NUXT_TURNSTILE_SECRET_KEY: string
}

export interface MessageBody {
    token: string
    first_name: string
    middle_name: string
    last_name: string
    message_email: string
    message_subject: string
    message: string
}

async function handleSendgrid(request: MessageBody) {
    const url = 'https://sendgrid.ashishbhoi.workers.dev'
    const message = {
        first_name: request.first_name,
        middle_name: request.middle_name,
        last_name: request.last_name,
        message_email: request.message_email,
        message_subject: request.message_subject,
        message: request.message
    }
    const init = {
        body: JSON.stringify(message),
        method: "POST"
    };
    return await fetch(url, init);
}

async function handleRequest(request: Request, environment: Environment) {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Max-Age": "86400",
    };

    const sendgridFailure = {
        success: false
    }
    const body: MessageBody = JSON.parse(JSON.stringify(await request.json()))
    // Turnstile injects a token in "cf-turnstile-response".
    const token = body.token
    const ip = request.headers.get('CF-Connecting-IP');

    // Validate the token by calling the "/siteverify" API.
    let formData = new FormData();
    formData.append('secret', environment.NUXT_TURNSTILE_SECRET_KEY);
    formData.append('response', token!);
    formData.append('remoteip', ip!);

    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        body: formData,
        method: 'POST',
    });

    const outcome: any = await result.json();
    if (!outcome.success) {
        return new Response(JSON.stringify(outcome), {
            headers: {
                ...corsHeaders
            }
        });
    }
    // The Turnstile token was successfully validated. Proceed with your application logic.
    const sendgridResult = await handleSendgrid(body)
    if (sendgridResult.status !== 202) {
        return new Response(JSON.stringify(sendgridFailure), {
            headers: {
                ...corsHeaders
            }
        });
    }
    return new Response(JSON.stringify(outcome), {
        headers: {
            ...corsHeaders
        }
    });
}

async function handleOptions(request: Request) {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
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
    async fetch(request, env: Environment) {
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST,OPTIONS",
            "Access-Control-Max-Age": "86400",
        };

        if (request.method === 'POST') {
            return await handleRequest(request, env);
        } else if (request.method === "OPTIONS") {
            // Handle CORS preflight requests
            return handleOptions(request);
        }
        return new Response(new Blob(), {
            status: 401, statusText: "Method not allowed",
            headers: {
                ...corsHeaders
            }
        })
    },
};

export default handler;