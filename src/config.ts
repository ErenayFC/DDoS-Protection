export const ddosConfig = {
  limits: {
    userRequestLimit: 25,
    userBanLimit: 100,
    globalRequestLimit: 10,
    userBanTimeout: 60 * 60 * 1000,
    userDataTimeout: 2 * 60 * 1000,
    globalDdosTimeout: 5 * 60 * 1000,
  },
  features: {
    enableUserDdosProtection: true,
    enableGlobalDdosProtection: true,
  },
  messages: {
    userDDoSMessage: "Rate limit exceeded.",
    globalDDoSMessage:
      "We are experiencing high traffic. Please try again later.",
  },
  paths: {
    usersDataFile: "./data/users.json",
    uniqueIPsFile: "./data/uniqueIPs.json",
  },
  fallbackIP: "1.11.111.1111",
  debug: true,
  mainCountry: "TR",
  protectedUrls: ["/"],
};
