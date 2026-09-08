async function fetchAndApply(request) {

  if (request.method === "OPTIONS") {
    return handleOptions(request);
  }

  /*
   * Keep the PUBLIC request URL separate from the
   * INTERNAL Notion URL.
   */
  const requestUrl = new URL(request.url);

  const url = new URL(request.url);

  /*
   * Notion remains the internal origin.
   */
  url.hostname = "www.notion.so";


  /* ----------------------------------------------------------
     ROBOTS.TXT
     ---------------------------------------------------------- */

  if (requestUrl.pathname === "/robots.txt") {

    return new Response(
      "Sitemap: https://" +
      MY_DOMAIN +
      "/sitemap.xml"
    );

  }


  /* ----------------------------------------------------------
     SITEMAP.XML
     ---------------------------------------------------------- */

  if (requestUrl.pathname === "/sitemap.xml") {

    const response =
      new Response(generateSitemap());

    response.headers.set(
      "content-type",
      "application/xml"
    );

    return response;

  }


  /* ----------------------------------------------------------
     NOTION JAVASCRIPT
     ---------------------------------------------------------- */

  if (
    url.pathname.startsWith("/app") &&
    url.pathname.endsWith("js")
  ) {

    response =
      await fetch(url.toString());

    const body =
      await response.text();

    response = new Response(

      body
        .replace(
          /www\.notion\.so/g,
          MY_DOMAIN
        )
        .replace(
          /notion\.so/g,
          MY_DOMAIN
        ),

      response

    );

    response.headers.set(
      "Content-Type",
      "application/x-javascript"
    );

    return response;

  }


  /* ----------------------------------------------------------
     NOTION API
     ---------------------------------------------------------- */

  if (url.pathname.startsWith("/api")) {

    response =
      await fetch(

        url.toString(),

        {
          body:
            url.pathname.startsWith(
              "/api/v3/getPublicPageData"
            )
              ? null
              : request.body,

          headers: {

            "content-type":
              "application/json;charset=UTF-8",

            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

          },

          method: "POST"

        }

      );


    response =
      new Response(
        response.body,
        response
      );


    response.headers.set(
      "Access-Control-Allow-Origin",
      "*"
    );


    return response;

  }


  /* ==========================================================
     PUBLIC HOMEPAGE
     ========================================================== */

  /*
   * IMPORTANT:
   *
   * health365.online/
   * must NOT redirect to the Notion UUID.
   *
   * Instead, internally fetch:
   *
   * www.notion.so/<homepage-page-id>
   *
   * while keeping the browser URL:
   *
   * health365.online/
   */

  if (
    requestUrl.pathname === "/" &&
    SLUG_TO_PAGE[""] 
  ) {

    url.pathname =
      "/" + SLUG_TO_PAGE[""];

  }


  /* ==========================================================
     PRETTY URL → INTERNAL NOTION PAGE
     ========================================================== */

  else if (
    requestUrl.pathname !== "/" &&
    slugs.indexOf(
      requestUrl.pathname.slice(1)
    ) > -1
  ) {

    const slug =
      requestUrl.pathname.slice(1);

    const pageId =
      SLUG_TO_PAGE[slug];

    url.pathname =
      "/" + pageId;

  }


  /* ==========================================================
     DIRECT NOTION PAGE ID
     ========================================================== */

  /*
   * If somebody visits:
   *
   * health365.online/7d2ec059...
   *
   * send them back to the clean homepage.
   */

  else if (
    requestUrl.pathname !== "/" &&
    pages.indexOf(
      requestUrl.pathname.slice(1)
    ) > -1
  ) {

    return Response.redirect(

      "https://" +
      MY_DOMAIN,

      301

    );

  }


  /* ==========================================================
     UNKNOWN NOTION PAGE ID
     ========================================================== */

  else if (
    requestUrl.pathname !== "/" &&
    pages.indexOf(
      requestUrl.pathname.slice(1)
    ) === -1 &&
    requestUrl.pathname
      .slice(1)
      .match(/^[0-9a-f]{32}$/)
  ) {

    return Response.redirect(

      "https://" +
      MY_DOMAIN,

      301

    );

  }


  /* ==========================================================
     FETCH NOTION PAGE
     ========================================================== */

  response =
    await fetch(

      url.toString(),

      {

        body:
          request.body,

        headers: {

          ...Object.fromEntries(
            request.headers
          ),

          /*
           * Prevent Google/other crawler UAs from
           * being forwarded to Notion.
           */
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

        },

        method:
          request.method

      }

    );


  response =
    new Response(
      response.body,
      response
    );


  /* ----------------------------------------------------------
     REMOVE CSP THAT CAN BLOCK FRUITION CUSTOMIZATION
     ---------------------------------------------------------- */

  response.headers.delete(
    "Content-Security-Policy"
  );

  response.headers.delete(
    "X-Content-Security-Policy"
  );


  return appendJavascript(
    response,
    SLUG_TO_PAGE
  );

}
