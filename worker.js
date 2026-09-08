```javascript
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

  /*
   * Response variable used throughout this function.
   */
  let response;


  /* ----------------------------------------------------------
     ROBOTS.TXT
     ---------------------------------------------------------- */

  if (requestUrl.pathname === "/robots.txt") {

    return new Response(
      "User-agent: *\n" +
      "Allow: /\n\n" +
      "Sitemap: https://" +
      MY_DOMAIN +
      "/sitemap.xml"
    );

  }


  /* ----------------------------------------------------------
     SITEMAP.XML
     ---------------------------------------------------------- */

  if (requestUrl.pathname === "/sitemap.xml") {

    response =
      new Response(
        generateSitemap()
      );

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
    url.pathname.endsWith(".js")
  ) {

    response =
      await fetch(
        url.toString()
      );

    const body =
      await response.text();

    /*
     * Rewrite only the canonical Notion hostname.
     */
    const rewrittenBody =
      body.replace(
        /www\.notion\.so/g,
        MY_DOMAIN
      );

    response =
      new Response(
        rewrittenBody,
        response
      );

    response.headers.set(
      "Content-Type",
      "application/javascript"
    );

    return response;

  }


  /* ----------------------------------------------------------
     NOTION API
     ---------------------------------------------------------- */

  if (url.pathname.startsWith("/api")) {

    /*
     * IMPORTANT:
     *
     * Forward the original POST body intact.
     *
     * This is required by:
     *
     * /api/v3/getPublicPageDataForDomain
     *
     * The previous version deliberately sent a null body
     * to this endpoint, producing HTTP 400.
     */
    response =
      await fetch(
        url.toString(),
        {
          body:
            request.body,

          headers: {
            "content-type":
              request.headers.get(
                "content-type"
              ) ||
              "application/json;charset=UTF-8",

            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
          },

          method:
            "POST"
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
   * health365.online/
   *
   * Internally fetch the Notion homepage page ID
   * while keeping the public browser URL unchanged.
   */

  if (
    requestUrl.pathname === "/" &&
    SLUG_TO_PAGE[""]
  ) {

    url.pathname =
      "/" +
      SLUG_TO_PAGE[""];

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
      "/" +
      pageId;

  }


  /* ==========================================================
     DIRECT NOTION PAGE ID
     ========================================================== */

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
      .match(
        /^[0-9a-f]{32}$/
      )
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
           * Prevent crawler UAs from being forwarded
           * directly to Notion.
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


  /* ----------------------------------------------------------
     PRESERVE HEALTH365 UI / FRUITION CUSTOMIZATION
     ---------------------------------------------------------- */

  return appendJavascript(
    response,
    SLUG_TO_PAGE
  );

}
```
