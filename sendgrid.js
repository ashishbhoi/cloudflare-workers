const SENDGRID_API_KEY = "";

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
  let emailResponse = await sendEmail({
    to: reqBody.email_id,
    name: reqBody.first_name.concat(
      " ",
      reqBody.middle_name,
      " ",
      reqBody.last_name
    ),
    subject: reqBody.subject,
    message: reqBody.message,
  });

  if (emailResponse.status != 202) {
    errorMessage = JSON.parse(emailResponse);
    return new Response(
      JSON.stringify({ status: "NotOk", message: errorMessage }),
      {
        statusText: "Mail sent error",
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } else {
    return new Response(
      JSON.stringify({ status: "Ok", message: "Contact message sent" }),
      {
        statusText: "Mail sent",
        status: 202,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

async function sendEmail({ to, subject, name, message }) {
  const full_message = `
    Name: ${name}<br/>
    Email: ${to}<br/>
    Message: ${message}
    `;

  if (!to) {
    return new Response(
      JSON.stringify({ status: "NotOk", message: "Please provide your email" }),
      {
        statusText: "No Email Address",
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  const email = await fetch("https://api.sendgrid.com/v3/mail/send", {
    body: JSON.stringify({
      personalizations: [
        {
          to: [
            {
              email: to,
            },
          ],
          cc: [
            {
              email: "ashish@ashishbhoi.com",
            },
          ],
        },
      ],
      from: {
        email: "no-reply@ashishbhoi.com",
      },
      subject: subject,
      content: [
        {
          type: "text/html",
          value: full_message,
        },
      ],
    }),
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (email.status != 202) {
    return JSON.stringify(await email.json());
  } else {
    return email;
  }
}
