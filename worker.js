```javascript
/* Step 1: enter your domain name like fruitionsite.com */
const MY_DOMAIN = "health365.online";

/*
 * Step 2: enter your URL slug to page ID mapping
 * The key on the left is the slug (without the slash)
 * The value on the right is the Notion page ID
 */
const SLUG_TO_PAGE = {
  "": "7d2ec05915af4131b7d9a30ccecd0cf0"
};

/* Step 3: enter your page title and description for SEO purposes */
const PAGE_TITLE = "Health365 Knowledge Hub";

const PAGE_DESCRIPTION =
  "Evidence-informed health, nutrition, wellness and practical health guidance from Health365.";

/* Step 4: enter a Google Font name */
const GOOGLE_FONT = "Inter";

/* Step 5: enter any custom scripts you'd like */
const CUSTOM_SCRIPT = ``;

/* CONFIGURATION ENDS HERE */

const PAGE_TO_SLUG = {};
const slugs = [];
const pages = [];

Object.keys(SLUG_TO_PAGE).forEach(slug => {
  const page = SLUG_TO_PAGE[slug];

  slugs.push(slug);
  pages.push(page);

  PAGE_TO_SLUG[page] = slug;
});

addEventListener("fetch", event => {
  event.respondWith(fetchAndApply(event.request));
});


function generateSitemap() {
  let sitemap =
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

  slugs.forEach(slug => {
    sitemap +=
      "<url><loc>https://" +
      MY_DOMAIN +
      "/" +
      slug +
      "</loc></url>";
  });

  sitemap += "</urlset>";

  return sitemap;
}


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};


function handleOptions(request) {
  if (
    request.headers.get("Origin") !== null &&
    request.headers.get("Access-Control-Request-Method") !== null &&
    request.headers.get("Access-Control-Request-Headers") !== null
  ) {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  return new Response(null, {
    headers: {
      Allow: "GET, HEAD, POST, PUT, OPTIONS"
    }
  });
}


async function fetchAndApply(request) {
  if (request.method === "OPTIONS") {
    return handleOptions(request);
  }

  const requestUrl = new URL(request.url);

  /*
   * Keep the PUBLIC URL completely separate from the
   * INTERNAL Notion origin URL.
   *
   * public:
   *   https://health365.online/
   *
   * internal:
   *   https://www.notion.so/7d2ec05915af4131b7d9a30ccecd0cf0
   */
  const url = new URL(request.url);

  url.hostname = "www.notion.so";


  /*
   * ROBOTS
   */
  if (requestUrl.pathname === "/robots.txt") {
    return new Response(
      "Sitemap: https://" + MY_DOMAIN + "/sitemap.xml",
      {
        headers: {
          "Content-Type": "text/plain"
        }
      }
    );
  }


  /*
   * SITEMAP
   */
  if (requestUrl.pathname === "/sitemap.xml") {
    const response = new Response(generateSitemap());

    response.headers.set(
      "Content-Type",
      "application/xml"
    );

    return response;
  }


  /*
   * HOMEPAGE
   *
   * IMPORTANT:
   *
   * We do NOT redirect the visitor.
   *
   * We only change the INTERNAL Notion fetch target.
   *
   * Browser remains:
   *     https://health365.online/
   *
   * Worker fetches:
   *     https://www.notion.so/7d2ec05915af4131b7d9a30ccecd0cf0
   */
  const isHomepage =
    requestUrl.pathname === "/" ||
    requestUrl.pathname === "";


  if (isHomepage && SLUG_TO_PAGE[""]) {
    url.pathname =
      "/" + SLUG_TO_PAGE[""];
  }


  let response;


  /*
   * NOTION APP JAVASCRIPT
   */
  if (
    url.pathname.startsWith("/app") &&
    url.pathname.endsWith("js")
  ) {
    response = await fetch(url.toString());

    const body = await response.text();

    response = new Response(
      body
        .replace(/www.notion.so/g, MY_DOMAIN)
        .replace(/notion.so/g, MY_DOMAIN),
      response
    );

    response.headers.set(
      "Content-Type",
      "application/x-javascript"
    );

    return response;
  }


  /*
   * NOTION API
   */
  else if (url.pathname.startsWith("/api")) {
    response = await fetch(url.toString(), {
      body: url.pathname.startsWith(
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
    });

    response = new Response(
      response.body,
      response
    );

    response.headers.set(
      "Access-Control-Allow-Origin",
      "*"
    );

    return response;
  }


  /*
   * NAMED SLUG
   *
   * For future pages such as:
   *
   * /oral-health
   * /nutrition
   * /weight-loss
   *
   * the public slug is converted internally to
   * the appropriate Notion page ID.
   */
  else if (
    requestUrl.pathname !== "/" &&
    slugs.indexOf(
      requestUrl.pathname.slice(1)
    ) > -1
  ) {
    const pageId =
      SLUG_TO_PAGE[
        requestUrl.pathname.slice(1)
      ];

    url.pathname = "/" + pageId;

    response = await fetch(url.toString(), {
      body: request.body,

      headers: {
        ...Object.fromEntries(
          request.headers
        ),

        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
      },

      method: request.method
    });

    response = new Response(
      response.body,
      response
    );

    response.headers.delete(
      "Content-Security-Policy"
    );

    response.headers.delete(
      "X-Content-Security-Policy"
    );
  }


  /*
   * DIRECT NOTION PAGE-ID REQUEST
   *
   * If somebody requests:
   *
   * /7d2ec05915af4131b7d9a30ccecd0cf0
   *
   * send them back to the public homepage.
   *
   * This prevents the Notion UUID from becoming
   * the canonical public URL.
   */
  else if (
    pages.indexOf(
      requestUrl.pathname.slice(1)
    ) > -1
  ) {
    return Response.redirect(
      "https://" + MY_DOMAIN + "/",
      301
    );
  }


  /*
   * OTHER 32-CHARACTER NOTION PAGE IDs
   */
  else if (
    pages.indexOf(
      requestUrl.pathname.slice(1)
    ) === -1 &&
    requestUrl.pathname
      .slice(1)
      .match(/^[0-9a-f]{32}$/)
  ) {
    return Response.redirect(
      "https://" + MY_DOMAIN + "/",
      301
    );
  }


  /*
   * NORMAL NOTION DOCUMENT / ASSET REQUEST
   */
  else {
    response = await fetch(
      url.toString(),
      {
        body: request.body,

        headers: {
          ...Object.fromEntries(
            request.headers
          ),

          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        },

        method: request.method
      }
    );

    response = new Response(
      response.body,
      response
    );

    response.headers.delete(
      "Content-Security-Policy"
    );

    response.headers.delete(
      "X-Content-Security-Policy"
    );
  }


  return appendJavascript(
    response,
    SLUG_TO_PAGE
  );
}


/*
 * META TAG REWRITER
 */
class MetaRewriter {
  element(element) {

    if (PAGE_TITLE !== "") {

      if (
        element.getAttribute("property") ===
          "og:title" ||

        element.getAttribute("name") ===
          "twitter:title"
      ) {
        element.setAttribute(
          "content",
          PAGE_TITLE
        );
      }

      if (
        element.tagName === "title"
      ) {
        element.setInnerContent(
          PAGE_TITLE
        );
      }
    }


    if (PAGE_DESCRIPTION !== "") {

      if (
        element.getAttribute("name") ===
          "description" ||

        element.getAttribute("property") ===
          "og:description" ||

        element.getAttribute("name") ===
          "twitter:description"
      ) {
        element.setAttribute(
          "content",
          PAGE_DESCRIPTION
        );
      }
    }


    if (
      element.getAttribute("property") ===
        "og:url" ||

      element.getAttribute("name") ===
        "twitter:url"
    ) {
      element.setAttribute(
        "content",
        "https://" + MY_DOMAIN + "/"
      );
    }


    if (
      element.getAttribute("name") ===
      "apple-itunes-app"
    ) {
      element.remove();
    }
  }
}


/*
 * HEAD REWRITER
 */
class HeadRewriter {
  element(element) {

    if (GOOGLE_FONT !== "") {

      element.append(
        `<link href="https://fonts.googleapis.com/css?family=${GOOGLE_FONT.replace(
          " ",
          "+"
        )}:Regular,Bold,Italic&display=swap" rel="stylesheet">

        <style>
          * {
            font-family: "${GOOGLE_FONT}" !important;
          }
        </style>`,

        {
          html: true
        }
      );
    }


    element.append(
      `<style>

      div.notion-topbar > div > div:nth-child(3) {
        display: none !important;
      }

      div.notion-topbar > div > div:nth-child(4) {
        display: none !important;
      }

      div.notion-topbar > div > div:nth-child(5) {
        display: none !important;
      }

      div.notion-topbar > div > div:nth-child(6) {
        display: none !important;
      }

      div.notion-topbar-mobile > div:nth-child(3) {
        display: none !important;
      }

      div.notion-topbar-mobile > div:nth-child(4) {
        display: none !important;
      }

      div.notion-topbar > div > div:nth-child(1n).toggle-mode {
        display: block !important;
      }

      div.notion-topbar-mobile > div:nth-child(1n).toggle-mode {
        display: block !important;
      }

      </style>`,

      {
        html: true
      }
    );
  }
}


/*
 * BODY REWRITER
 */
class BodyRewriter {

  constructor(SLUG_TO_PAGE) {
    this.SLUG_TO_PAGE =
      SLUG_TO_PAGE;
  }


  element(element) {

    element.append(
      `<script>

      /*
       * Fruition configuration
       */

      window.CONFIG.domainBaseUrl =
        'https://${MY_DOMAIN}';

      const SLUG_TO_PAGE =
        ${JSON.stringify(this.SLUG_TO_PAGE)};

      const PAGE_TO_SLUG = {};
      const slugs = [];
      const pages = [];

      const el =
        document.createElement('div');

      let redirected = false;


      Object.keys(
        SLUG_TO_PAGE
      ).forEach(slug => {

        const page =
          SLUG_TO_PAGE[slug];

        slugs.push(slug);
        pages.push(page);

        PAGE_TO_SLUG[page] =
          slug;
      });


      /*
       * Determine the Notion page ID.
       *
       * On the public homepage we intentionally
       * keep the browser at "/".
       */
      function getPage() {

        const path =
          location.pathname;

        if (path === "/") {
          return SLUG_TO_PAGE[""];
        }

        return path.slice(-32);
      }


      function getSlug() {

        const path =
          location.pathname;

        if (path === "/") {
          return "";
        }

        return path.slice(1);
      }


      /*
       * Keep the public URL clean.
       */
      function updateSlug() {

        const page =
          getPage();

        const slug =
          PAGE_TO_SLUG[page];

        if (
          slug != null &&
          location.pathname !== "/" + slug
        ) {

          history.replaceState(
            history.state,
            "",
            "/" + slug
          );
        }
      }


      /*
       * DARK MODE
       */
      function onDark() {

        el.innerHTML =
          '<div title="Change to Light Mode" style="margin-left: auto; margin-right: 14px; min-width: 0px;"><div role="button" tabindex="0" style="user-select: none; transition: background 120ms ease-in 0s; cursor: pointer; border-radius: 44px;"><div style="display: flex; flex-shrink: 0; height: 14px; width: 26px; border-radius: 44px; padding: 2px; box-sizing: content-box; background: rgb(46, 170, 220); transition: background 200ms ease 0s, box-shadow 200ms ease 0s;"><div style="width: 14px; height: 14px; border-radius: 44px; background: white; transition: transform 200ms ease-out 0s, background 200ms ease-out 0s; transform: translateX(12px) translateY(0px);"></div></div></div></div>';

        document.body.classList.add(
          "dark"
        );

        __console.environment.ThemeStore.setState({
          mode: "dark"
        });
      }


      function onLight() {

        el.innerHTML =
          '<div title="Change to Dark Mode" style="margin-left: auto; margin-right: 14px; min-width: 0px;"><div role="button" tabindex="0" style="user-select: none; transition: background 120ms ease-in 0s; cursor: pointer; border-radius: 44px;"><div style="display: flex; flex-shrink: 0; height: 14px; width: 26px; border-radius: 44px; padding: 2px; box-sizing: content-box; background: rgba(135, 131, 120, 0.3); transition: background 200ms ease 0s, box-shadow 200ms ease 0s;"><div style="width: 14px; height: 14px; border-radius: 44px; background: white; transition: transform 200ms ease-out 0s, background 200ms ease-out 0s; transform: translateX(0px) translateY(0px);"></div></div></div></div>';

        document.body.classList.remove(
          "dark"
        );

        __console.environment.ThemeStore.setState({
          mode: "light"
        });
      }


      function toggle() {

        if (
          document.body.classList.contains(
            "dark"
          )
        ) {
          onLight();
        } else {
          onDark();
        }
      }


      function addDarkModeButton(device) {

        const nav =
          device === "web"
            ? document.querySelector(
                ".notion-topbar"
              ).firstChild
            : document.querySelector(
                ".notion-topbar-mobile"
              );

        el.className =
          "toggle-mode";

        el.addEventListener(
          "click",
          toggle
        );

        nav.appendChild(el);


        if (
          window.matchMedia &&
          window.matchMedia(
            "(prefers-color-scheme: dark)"
          ).matches
        ) {
          onDark();
        } else {
          onLight();
        }


        window
          .matchMedia(
            "(prefers-color-scheme: dark)"
          )
          .addEventListener(
            "change",
            () => {
              toggle();
            }
          );
      }


      /*
       * Wait for Notion to initialise.
       */
      const observer =
        new MutationObserver(
          function() {

            if (redirected) {
              return;
            }

            const nav =
              document.querySelector(
                ".notion-topbar"
              );

            const mobileNav =
              document.querySelector(
                ".notion-topbar-mobile"
              );


            if (
              (
                nav &&
                nav.firstChild &&
                nav.firstChild.firstChild
              ) ||
              (
                mobileNav &&
                mobileNav.firstChild
              )
            ) {

              redirected = true;

              /*
               * Do NOT force the homepage
               * to the Notion UUID.
               */
              if (
                location.pathname !== "/"
              ) {
                updateSlug();
              }


              addDarkModeButton(
                nav
                  ? "web"
                  : "mobile"
              );


              const onpopstate =
                window.onpopstate;


              window.onpopstate =
                function() {

                  if (
                    slugs.includes(
                      getSlug()
                    )
                  ) {

                    const page =
                      SLUG_TO_PAGE[
                        getSlug()
                      ];

                    if (page) {

                      history.replaceState(
                        history.state,
                        "bypass",
                        "/" + page
                      );
                    }
                  }


                  if (onpopstate) {
                    onpopstate.apply(
                      this,
                      [].slice.call(
                        arguments
                      )
                    );
                  }


                  if (
                    location.pathname !== "/"
                  ) {
                    updateSlug();
                  }
                };
            }
          }
        );


      const notionApp =
        document.querySelector(
          "#notion-app"
        );


      if (notionApp) {

        observer.observe(
          notionApp,
          {
            childList: true,
            subtree: true
          }
        );
      }


      /*
       * Prevent Fruition from replacing
       * the clean homepage URL with the UUID.
       */
      const replaceState =
        window.history.replaceState;


      window.history.replaceState =
        function(state) {

          if (
            arguments[1] !== "bypass" &&
            slugs.includes(
              getSlug()
            )
          ) {
            return;
          }

          return replaceState.apply(
            window.history,
            arguments
          );
        };


      /*
       * Handle browser navigation.
       */
      const pushState =
        window.history.pushState;


      window.history.pushState =
        function(state) {

          const dest =
            new URL(
              arguments[2],
              location.origin
            );

          const id =
            dest.pathname.slice(-32);


          if (
            pages.includes(id)
          ) {

            arguments[2] =
              "/" +
              PAGE_TO_SLUG[id];
          }


          return pushState.apply(
            window.history,
            arguments
          );
        };


      /*
       * Rewrite XHR requests from the
       * custom domain back to Notion.
       */
      const open =
        window.XMLHttpRequest.prototype.open;


      window.XMLHttpRequest.prototype.open =
        function() {

          arguments[1] =
            arguments[1].replace(
              'https://${MY_DOMAIN}',
              'https://www.notion.so'
            );


          return open.apply(
            this,
            [].slice.call(
              arguments
            )
          );
        };

      </script>${CUSTOM_SCRIPT}`,

      {
        html: true
      }
    );
  }
}


/*
 * APPLY ALL HTML REWRITES
 */
async function appendJavascript(
  res,
  SLUG_TO_PAGE
) {

  return new HTMLRewriter()

    .on(
      "title",
      new MetaRewriter()
    )

    .on(
      "meta",
      new MetaRewriter()
    )

    .on(
      "head",
      new HeadRewriter()
    )

    .on(
      "body",
      new BodyRewriter(
        SLUG_TO_PAGE
      )
    )

    .transform(res);
}
```
