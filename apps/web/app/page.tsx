import { getWebRouteByPath } from "../src/route-registry";
import { translateLocalAppSurfaceText } from "@foundation/app-surface";

export default function Page() {
  const route = getWebRouteByPath("/");
  const heading = translateLocalAppSurfaceText("web.developerHome.heading");
  const description = translateLocalAppSurfaceText("web.developerHome.description");

  return (
    <main
      data-usf-route-id={route.routeId}
      data-usf-capability-id={route.capabilityId}
      data-usf-permission-ref={route.permissionRefs.join(",")}
      data-usf-i18n-keys={[heading.key, description.key].join(",")}
    >
      <h1>{heading.value}</h1>
      <p>{description.value}</p>
    </main>
  );
}
