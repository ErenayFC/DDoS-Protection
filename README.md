# DDoS Protection - Elysia.js DDoS Protection Middleware

A powerful and flexible DDoS protection middleware built for Elysia.js applications to defend your web services against both user-specific and distributed denial-of-service attacks.

![DDoS Protection](https://raw.githubusercontent.com/ErenayFC/DDoS-Protection/main/assets/shield-logo.png)

## Features

- **IP-based Rate Limiting**: Automatically blocks users who exceed request thresholds
- **Country-based Filtering**: Prioritizes traffic from your main target country during attacks
- **Global DDoS Detection**: Monitors unique IP counts to identify and mitigate distributed attacks
- **Persistent Storage**: Uses JSON files to track banned IPs and request data across server restarts
- **Highly Configurable**: Customize all thresholds, timeouts, and protection behaviors
- **Cloudflare Compatible**: Works seamlessly with Cloudflare headers for accurate IP detection
- **Debug Mode**: Detailed logging to monitor protection activities in real-time

## Prerequisites

This project requires [Bun](https://bun.sh/) as the JavaScript runtime. Bun is a fast all-in-one JavaScript runtime, bundler and package manager.

## Installation

### 1. Install Bun

If you don't have Bun installed, you can install it with:

**macOS, Linux, or WSL:**

```bash
curl -fsSL https://bun.sh/install | bash
```

**Windows (using PowerShell):**

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

**Verify installation:**

```bash
bun --version
```

### 2. Clone the repository

```bash
# Clone the repository
git clone https://github.com/ErenayFC/DDoS-Protection.git
cd DDoS-Protection

# Install dependencies
bun install
```

## Quick Start

Run the development server:

```bash
bun run dev
```

The server will start at <http://localhost:3000>.

## Project Structure

```txt
DDoS-Protection/
├── src/
│   ├── index.ts              # Main application entry point
│   ├── config.ts             # Configuration settings
│   └── middlewares/
│       └── ddosProtection.ts # DDoS protection middleware
├── data/                     # Generated during runtime - stores JSON data
│   ├── users.json            # User request data and ban information
│   └── uniqueIPs.json        # Unique IP tracking for global DDoS detection
├── package.json
└── README.md
```

## Configuration

Edit the `src/config.ts` file to customize protection settings:

```typescript
export const ddosConfig = {
  limits: {
    userRequestLimit: 25,           // Max requests per user before rate limiting
    userBanLimit: 100,              // Threshold for extended ban
    globalRequestLimit: 10,         // Unique IPs threshold for global DDoS detection
    userBanTimeout: 3600 * 1000,    // User ban duration (1 hour)
    userDataTimeout: 2 * 60 * 1000, // User data retention time (2 minutes)
    globalDdosTimeout: 5 * 60 * 1000 // Global DDoS mode duration (5 minutes)
  },
  features: {
    enableUserDdosProtection: true, // Enable/disable per-user protection
    enableGlobalDdosProtection: true // Enable/disable global protection
  },
  messages: {
    userDdosMessage: "Rate limit exceeded. Please try again in 2 minutes.",
    globalDdosMessage: "We are experiencing high traffic. Please try again later."
  },
  paths: {
    usersDataFile: "./data/users.json",
    uniqueIPsFile: "./data/uniqueIPs.json"
  },
  fallbackIP: "1.11.111.1111"  // Fallback IP for localhost/unknown IPs
};
```

## Usage

In `src/index.ts`, you'll find the main application that uses the middleware:

```typescript
import { Elysia } from "elysia";
import { ddosProtection } from "./middlewares/ddosProtection";

const app = new Elysia()
  .use(ddosProtection({
    protectedUrls: ["/"],           // Endpoints to protect
    mainCountry: "TR",              // Primary target country code
    mainInfo: "We are experiencing high traffic. Please try again later.",
    debug: false                    // Set to true for detailed logs
  }))
  .get("/", ({ ddosProtected, ddosStatus, banTimeLeft, uniqueIPs, options, set }) => {
    // Handle user rate limit
    if (ddosStatus === "USER_DDOS") {
      set.status = 429;
      return {
        error: "Rate limit exceeded",
        message: `Please try again in ${banTimeLeft} minutes.`
      };
    }
    
    // Handle global DDoS attack
    if (ddosStatus === "GLOBAL_DDOS") {
      set.status = 503;
      return {
        error: "Service temporarily unavailable",
        message: options.mainInfo
      };
    }
    
    // Normal response
    return {
      message: "Hello world!",
      protected: ddosProtected,
      time: new Date(),
      country: options.mainCountry,
      activeConnections: uniqueIPs
    };
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
```

## Response Data

The middleware adds the following data to your request context:

```typescript
{
  ddosProtected: boolean,     // Whether the current endpoint is protected
  ddosStatus: string,         // "NORMAL", "USER_DDOS", "GLOBAL_DDOS", or "ERROR"
  banTimeLeft: number,        // Minutes remaining on user ban (if applicable)
  uniqueIPs: number,          // Count of unique IPs in the current time window
  requestTime: Date,          // Timestamp of the request
  options: object             // Configuration options passed to the middleware
}
```

## How It Works

1. **Request Tracking**: Each request to a protected endpoint is tracked by IP address
2. **Rate Limiting**: If a user exceeds the configured request limit, they are temporarily banned
3. **Country Prioritization**: During attacks, traffic from the main country is prioritized
4. **Global DDoS Detection**: When the number of unique IPs exceeds the threshold, global DDoS mode activates
5. **Persistence**: All ban and request data is stored in JSON files for reliability across server restarts

## Production Deployment

For production deployment, you may want to:

1. Set `debug: false` in your middleware configuration
2. Consider using a more robust storage system like Redis instead of JSON files (would require modifications)
3. Use a proper process manager like PM2 or deploy with Docker

To build for production:

```bash
bun run build
```

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ErenayFC/DDoS-Protection&type=Date)](https://www.star-history.com/#ErenayFC/DDoS-Protection&Date)

## Testing

To test the DDoS protection:

```bash
# Run a simple test that simulates multiple requests
bun run test
```

## License

MIT

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## Acknowledgements

- [Elysia.js](https://elysiajs.com/) - TypeScript with End-to-End Type Safety, type integrity, and exceptional developer experience. Supercharged by Bun.
- [Bun](https://bun.sh/) - Bun is a fast JavaScript all-in-one toolkit|
- [geoip-lite](https://github.com/geoip-lite/node-geoip) - A native NodeJS API for the GeoLite data from MaxMind.

---

Created with ❤️ by [ErenayFC](https://erenaydev.com.tr)
