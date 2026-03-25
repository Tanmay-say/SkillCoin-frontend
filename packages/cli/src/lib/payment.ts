import http from "http";
import chalk from "chalk";
import ora from "ora";
import { buildPaymentPage, type PaymentPageParams } from "./payment-page";

const PAYMENT_PORT_START = 7402;
const PAYMENT_PORT_END = 7410;
const PAYMENT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Filecoin Calibration testnet (native tFIL used as payment token on testnet)
const FILECOIN_CALIBRATION = {
  chainId: 314159,
  rpcUrl: "https://api.calibration.node.glif.io/rpc/v1",
};

export interface PaymentRequest {
  skillName: string;
  skillId: string;
  price: number;
  recipient: string;
  currency: string;
}

/**
 * Browser-based payment flow:
 * 1. Spawn local HTTP server on localhost:7402
 * 2. Open browser to payment page
 * 3. User connects MetaMask → pays in native token (tFIL on Calibration testnet)
 * 4. Page POSTs txHash back to CLI server
 * 5. CLI shuts down server and returns txHash
 */
export async function handleBrowserPayment(
  req: PaymentRequest
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    let resolved = false;
    let timeoutTimer: NodeJS.Timeout;
    const spinner = ora("Opening payment page in your browser...").start();

    const pageParams: PaymentPageParams = {
      skillName: req.skillName,
      skillId: req.skillId,
      price: req.price,
      recipient: req.recipient,
      currency: req.currency || "USDC",
      chainId: FILECOIN_CALIBRATION.chainId,
      rpcUrl: FILECOIN_CALIBRATION.rpcUrl,
    };
    const paymentHtml = buildPaymentPage(pageParams);

    const server = http.createServer((httpReq, httpRes) => {
      if (httpReq.method === "GET" && (httpReq.url === "/" || httpReq.url === "")) {
        httpRes.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        httpRes.end(paymentHtml);
        return;
      }

      if (httpReq.method === "POST" && httpReq.url === "/confirm") {
        let body = "";
        httpReq.on("data", (chunk) => (body += chunk));
        httpReq.on("end", () => {
          try {
            const { txHash, error } = JSON.parse(body);
            httpRes.writeHead(200, {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            });
            httpRes.end(JSON.stringify({ ok: true }));
            setTimeout(() => {
              server.close();
              if ("closeAllConnections" in server) {
                (server as any).closeAllConnections();
              }
            }, 500);

            if (error) {
              resolved = true;
              clearTimeout(timeoutTimer);
              reject(new Error(error));
            } else if (txHash) {
              resolved = true;
              clearTimeout(timeoutTimer);
              spinner.succeed("Payment completed in browser");
              resolve(txHash);
            }
          } catch {
            httpRes.writeHead(400);
            httpRes.end();
          }
        });
        return;
      }

      if (httpReq.method === "OPTIONS") {
        httpRes.writeHead(200, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET",
          "Access-Control-Allow-Headers": "Content-Type",
        });
        httpRes.end();
        return;
      }

      httpRes.writeHead(404);
      httpRes.end("Not found");
    });

    let port = PAYMENT_PORT_START;

    const tryListen = () => {
      server.listen(port, "127.0.0.1", async () => {
        spinner.succeed("Payment page ready");
        console.log();
        console.log(
          chalk.dim(`  Opening: `) + chalk.cyan(`http://localhost:${port}`)
        );
        console.log(
          chalk.dim("  (If browser doesn't open, visit the URL above)")
        );
        console.log();

        try {
          const open = await import("open");
          await open.default(`http://localhost:${port}`);
        } catch {
          console.log(
            chalk.yellow(`  ⚠ Could not auto-open browser. Visit http://localhost:${port}`)
          );
        }

        console.log(chalk.dim("  Waiting for payment confirmation..."));
      });

      server.on("error", (err: any) => {
        if (err.code === "EADDRINUSE" && port < PAYMENT_PORT_END) {
          port++;
          tryListen();
        } else if (err.code === "EADDRINUSE") {
          reject(new Error(`Ports ${PAYMENT_PORT_START}-${PAYMENT_PORT_END} all in use.`));
        } else {
          reject(err);
        }
      });
    };

    tryListen();

    timeoutTimer = setTimeout(() => {
      if (!resolved) {
        server.close();
        if ("closeAllConnections" in server) {
          (server as any).closeAllConnections();
        }
        reject(new Error("Payment timeout — no response after 5 minutes"));
      }
    }, PAYMENT_TIMEOUT_MS);
  });
}
