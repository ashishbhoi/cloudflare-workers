const SITE_KEY = "";

addEventListener("fetch", (event) => {
  const { request } = event;
  const { url } = request;
  if (request.method === "POST") {
    return event.respondWith(handlePostRequest(request));
  } else if (request.method === "GET") {
    return event.respondWith(handleGetRequest(request));
  }
});

async function handleGetRequest() {
  return new Response(
    JSON.stringify({
      status: "NotOk",
      message: "Only POST request is supported",
    }),
    {
      statusText: "Not POST Request",
      status: 202,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

async function readRequestBody(request) {
  const { headers } = request;
  const contentType = headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return JSON.stringify(await request.json());
  } else if (contentType.includes("application/text")) {
    return request.text();
  } else if (contentType.includes("text/html")) {
    return request.text();
  } else if (contentType.includes("form")) {
    const formData = await request.formData();
    const body = {};
    for (const entry of formData.entries()) {
      body[entry[0]] = entry[1];
    }
    return JSON.stringify(body);
  } else {
    return new Response(
      JSON.stringify({
        status: "NotOk",
        message: "Content Type not supported",
      }),
      {
        statusText: "Wrong Content Type",
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

async function handlePostRequest(request) {
  let reqBody = await readRequestBody(request);
  reqBody = JSON.parse(reqBody);
  let reCaptchaResponse = await checkReCaptcha({
    gRecaptchaToken: reqBody.gRecaptchaToken,
  });

  response = JSON.parse(reCaptchaResponse);

  if (response.score > 0.5) {
    return new Response(
      JSON.stringify({ status: "success", message: `score ${response.score}` }),
      {
        statusText: `Score is more than 0.5`,
        status: 202,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } else {
    return new Response(
      JSON.stringify({ status: "failure", message: `score ${response.score}` }),
      {
        statusText: `score is less then 0.5`,
        status: 202,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

async function checkReCaptcha({ gRecaptchaToken }) {
  if (!gRecaptchaToken) {
    JSON.stringify({ status: "NotOk", message: "Please provide your token" }),
      {
        statusText: "No token",
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      };
  }
  const reCaptcha = await fetch(
    "https://www.google.com/recaptcha/api/siteverify",
    {
      body: `secret=${SITE_KEY}&response=${gRecaptchaToken}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    }
  );
  
  success = JSON.stringify(await reCaptcha.json());
  if (success.success != false) {
    return success;
  } else {
    return new Response(
      JSON.stringify({ status: "failure", message: reCaptcha }),
      {
        statusText: `Error inputs`,
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
