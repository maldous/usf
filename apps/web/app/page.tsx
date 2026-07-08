import { getWebRouteByPath } from "../src/route-registry";
import { getLocalAccessibilitySurfaceById, translateLocalAppSurfaceText } from "@foundation/app-surface";

export default function Page() {
  const route = getWebRouteByPath("/");
  const accessibility = getLocalAccessibilitySurfaceById(route.routeId);
  const heading = translateLocalAppSurfaceText("web.developerHome.heading");
  const description = translateLocalAppSurfaceText("web.developerHome.description");

  return (
    <main
      data-usf-route-id={route.routeId}
      data-usf-capability-id={route.capabilityId}
      data-usf-permission-ref={route.permissionRefs.join(",")}
      data-usf-i18n-keys={[heading.key, description.key].join(",")}
      data-usf-accessibility-screen-reader-ref={accessibility.screenReaderRef}
      data-usf-accessibility-focus-order-ref={accessibility.focusOrderRef}
      data-usf-accessibility-keyboard-navigation-ref={accessibility.keyboardNavigationRef}
      data-usf-accessibility-error-announcement-ref={accessibility.errorAnnouncementRef}
      aria-labelledby="developer-home-title"
      aria-describedby="developer-home-description"
      tabIndex={-1}
    >
      <h1 id="developer-home-title">{heading.value}</h1>
      <p id="developer-home-description">{description.value}</p>
    </main>
  );
}
