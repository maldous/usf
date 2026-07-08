import { getWebRouteByPath } from "../src/route-registry";

export default function Page() {
  const route = getWebRouteByPath("/");

  return (
    <main
      data-usf-route-id={route.routeId}
      data-usf-capability-id={route.capabilityId}
      data-usf-permission-ref={route.permissionRefs.join(",")}
    >
      <h1>USF local app surface</h1>
      <p>This bounded local route is mapped to governed USF capability and permission semantics.</p>
    </main>
  );
}
