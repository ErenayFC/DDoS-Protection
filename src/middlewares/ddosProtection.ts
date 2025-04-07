import { Elysia } from "elysia";
import geoip from "geoip-lite";
import chalk from "chalk";
import { ddosConfig } from "../config";
import fs from "fs";
import path from "path";

let isDDoS = false;

const ensureDirectoryExists = (filePath: string) => {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
};
const readJSONFile = (filePath: string, defaultValue: any = {}) => {
  ensureDirectoryExists(filePath);

  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return defaultValue;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(defaultValue), "utf8");
  return defaultValue;
};

const writeJSONFile = (filePath: string, data: any) => {
  ensureDirectoryExists(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
};

let usersData = readJSONFile(ddosConfig.paths.usersDataFile, {});
let uniqueIPsData = readJSONFile(ddosConfig.paths.uniqueIPsFile, {
  ips: [],
  timestamp: Date.now(),
});

setInterval(function () {
    uniqueIPsData = readJSONFile(ddosConfig.paths.uniqueIPsFile, { ips: [], timestamp: Date.now() });
    const uniqueIPCount = uniqueIPsData.ips.length;
    
    if (ddosConfig.features.enableGlobalDdosProtection && !isDDoS && uniqueIPCount > ddosConfig.limits.globalRequestLimit) {
      isDDoS = true;
      for (let i = 0; i < 20; i++) {
        console.log(chalk.red(`[DEFENSE SYSTEM] WARNING DDOS ATTACK DETECTED! Unique IPs: ${uniqueIPCount}`));
      }
      setTimeout(function () {
        for (let i = 0; i < 20; i++) {
          console.log(chalk.green("[DEFENSE SYSTEM] DDOS ATTACKS NOW STOPPED!"));
        }
        isDDoS = false;
        
        uniqueIPsData = { ips: [], timestamp: Date.now() };
        writeJSONFile(ddosConfig.paths.uniqueIPsFile, uniqueIPsData);
      }, ddosConfig.limits.globalDdosTimeout);
      return;
    }
    
    if (Date.now() - uniqueIPsData.timestamp > 2000) {
      uniqueIPsData = { ips: [], timestamp: Date.now() };
      writeJSONFile(ddosConfig.paths.uniqueIPsFile, uniqueIPsData);
    }
  }, ddosConfig.limits.userBanTimeout);
  
  const getIP = async (request: Request) => {
    const forwardedFor = request.headers.get("x-forwarded-for") || "";
    let ip = forwardedFor.replace(/:\d+$/, "");
    
    if (!ip) {
      //@ts-ignore
      ip = request.conn?.remoteAddress || "127.0.0.1";
    }
    
    if (ip.includes("::ffff:")) {
      ip = ip.split(":").reverse()[0] || ip;
    }
    
    if (ip === "127.0.0.1" || ip === "::1") {
      return ddosConfig.fallbackIP;
    }
    
    var lookedUpIP = await geoip.lookup(ip);
    
    if (!lookedUpIP) {
      return ddosConfig.fallbackIP;
    }
    
    return lookedUpIP.country || ip;
  };
  
  export const ddosProtection = (options: {
    protectedUrls: string[];
    mainCountry: string;
    debug: boolean;
  }) => {
    return new Elysia().derive({ as: "global" }, async ({ request, set }) => {
      const requestUrl = new URL(request.url);
      const isProtected = options.protectedUrls.includes(requestUrl.pathname);
      let ddosStatus = "NORMAL";
      let banExpiry = 0;
      
      if (isProtected) {
        try {
          let ipAddress = request.headers.get("cf-connecting-ip") || (await getIP(request));
          let geo = request.headers.get("cf-ipcountry") || (await geoip.lookup(ipAddress))?.country || "UNKNOWN";
          
          usersData = readJSONFile(ddosConfig.paths.usersDataFile, {});
          uniqueIPsData = readJSONFile(ddosConfig.paths.uniqueIPsFile, { ips: [], timestamp: Date.now() });
          
          if (!uniqueIPsData.ips.includes(ipAddress)) {
            uniqueIPsData.ips.push(ipAddress);
            writeJSONFile(ddosConfig.paths.uniqueIPsFile, uniqueIPsData);
          }
          
          const userKey = `data_${ipAddress}`;
          let userData = usersData[userKey] || { count: 0, banExpiry: 0 };
          
          if (ddosConfig.features.enableUserDdosProtection && userData.count > ddosConfig.limits.userRequestLimit) {
            if (userData.banExpiry > Date.now()) {
              banExpiry = userData.banExpiry;
              ddosStatus = "USER_DDOS";
            } else if (!isDDoS) {
              const newBanExpiry = Date.now() + ddosConfig.limits.userBanTimeout;
              
              setTimeout(function () {
                usersData = readJSONFile(ddosConfig.paths.usersDataFile, {});
                if (options.debug) console.log("[DDOS] User Ban Deleted : " + ipAddress);
                usersData[userKey] = { count: 0, banExpiry: 0 };
                writeJSONFile(ddosConfig.paths.usersDataFile, usersData);
              }, ddosConfig.limits.userBanTimeout);
              
              if (options.debug) console.log("[DDOS] User Banned : " + ipAddress);
              usersData[userKey] = { count: ddosConfig.limits.userBanLimit + 1, banExpiry: newBanExpiry };
              writeJSONFile(ddosConfig.paths.usersDataFile, usersData);
              
              banExpiry = newBanExpiry;
              ddosStatus = "USER_DDOS";
            } else {
              if (options.debug) console.log("[DDOS] User Banned During Global DDoS : " + ipAddress);
              
              const newBanExpiry = Date.now() + ddosConfig.limits.userBanTimeout;
              usersData[userKey] = { count: ddosConfig.limits.userBanLimit + 1, banExpiry: newBanExpiry };
              writeJSONFile(ddosConfig.paths.usersDataFile, usersData);
              
              banExpiry = newBanExpiry;
              ddosStatus = "USER_DDOS";
            }
          } else {
            if (userData.count > 0) {
              usersData[userKey] = { 
                count: userData.count + 1, 
                banExpiry: userData.banExpiry 
              };
              writeJSONFile(ddosConfig.paths.usersDataFile, usersData);
            }
            
            if (userData.count === 0) {
              setTimeout(function () {
                usersData = readJSONFile(ddosConfig.paths.usersDataFile, {});
                if (options.debug) console.log("[DDOS] User DATA Deleted : " + ipAddress);
                usersData[userKey] = { count: 0, banExpiry: 0 };
                writeJSONFile(ddosConfig.paths.usersDataFile, usersData);
              }, ddosConfig.limits.userDataTimeout);
              
              usersData[userKey] = { count: 1, banExpiry: 0 };
              writeJSONFile(ddosConfig.paths.usersDataFile, usersData);
            }
            
            if (geo !== options.mainCountry) {
              if (isDDoS && ddosConfig.features.enableGlobalDdosProtection) {
                ddosStatus = "GLOBAL_DDOS";
              }
            }
          }
          
          if (options.debug) {
            console.log(
              `[DDOS-LOG] Joined site: ${geo} | DOS-Count: ${userData.count}/${ddosConfig.limits.userRequestLimit} | Global-DOS: ${uniqueIPsData.ips.length}/${ddosConfig.limits.globalRequestLimit}`
            );
          }
        } catch (e) {
          console.log(e);
          ddosStatus = "ERROR";
        }
      }
      
      return {
        ddosProtected: isProtected,
        ddosStatus,
        banTimeLeft: banExpiry ? Math.ceil((banExpiry - Date.now()) / 1000 / 60) : 0, // Remaining Timeout (minute)
        uniqueIPs: uniqueIPsData.ips.length,
        requestTime: new Date(),
        options: options,
      };
    });
  };