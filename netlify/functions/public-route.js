import {
  hostRejected,
  htmlResponse,
  methodAllowed,
  methodRejected,
  optionsResponse,
  publicRouteHtml,
  responseContext,
} from "./public-proof-shared.js";

export const handler = async (event) => {
  if (!methodAllowed(event.httpMethod)) {
    return methodRejected();
  }
  if (event.httpMethod === "OPTIONS") {
    return optionsResponse();
  }
  const context = responseContext(event);
  if (!context.accepted) {
    return hostRejected(context);
  }
  return htmlResponse(200, publicRouteHtml(context), event.httpMethod);
};
