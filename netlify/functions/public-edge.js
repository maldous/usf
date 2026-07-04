import {
  hostRejected,
  jsonResponse,
  methodAllowed,
  methodRejected,
  optionsResponse,
  publicEdgePayload,
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
  return jsonResponse(200, publicEdgePayload(context), event.httpMethod);
};
