import { Elysia } from "elysia";
import { ddosProtection } from "./middlewares/ddosProtection";
import { ddosConfig } from "./config";

const app = new Elysia()
  .use(ddosProtection({
    protectedUrls: ddosConfig.protectedUrls,
    mainCountry: ddosConfig.mainCountry,
    debug: ddosConfig.debug
  }))
  .get("/", ({ ddosProtected, ddosStatus, banTimeLeft, uniqueIPs, requestTime, options, set }) => {
    if (ddosStatus === "USER_DDOS") {
      set.status = 429;
      return {
        error: "Rate limit exceeded",
        message: `${ddosConfig.messages.userDDoSMessage} Try again in ${banTimeLeft} minutes.`,
        timeLeft: `${banTimeLeft} minutes`
      };
    }
    
    if (ddosStatus === "GLOBAL_DDOS") {
      set.status = 503;
      return {
        error: "Service temporarily unavailable",
        message: ddosConfig.messages.globalDDoSMessage,
        activeConnections: uniqueIPs
      };
    }
    
    return {
      message: "Hello world!",
      protected: ddosProtected,
      time: requestTime,
      country: options.mainCountry,
      activeConnections: uniqueIPs
    };
  })
  .listen(3000);

console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`);