import { IoAdapter } from "@nestjs/platform-socket.io";
import { ServerOptions } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { Logger } from "@nestjs/common";

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private readonly logger = new Logger(RedisIoAdapter.name);

  async connectToRedis(): Promise<boolean> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.logger.log("REDIS_URL not configured. WebSocket using local in-memory adapter.");
      return false;
    }

    try {
      this.logger.log(`Connecting to Redis at ${redisUrl}...`);
      
      const pubClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
      });
      const subClient = pubClient.duplicate();

      // Check connection with timeout
      await new Promise<void>((resolve, reject) => {
        let connectedCount = 0;
        const check = () => {
          connectedCount++;
          if (connectedCount === 2) {
            resolve();
          }
        };

        const timeout = setTimeout(() => {
          pubClient.disconnect();
          subClient.disconnect();
          reject(new Error("Redis connection timed out (5s)"));
        }, 5000);

        pubClient.on("connect", () => {
          this.logger.log("Redis pubClient connected.");
          check();
        });

        subClient.on("connect", () => {
          this.logger.log("Redis subClient connected.");
          check();
        });

        pubClient.on("error", (err) => {
          clearTimeout(timeout);
          reject(new Error(`pubClient connection error: ${err.message}`));
        });

        subClient.on("error", (err) => {
          clearTimeout(timeout);
          reject(new Error(`subClient connection error: ${err.message}`));
        });
      });

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log("Redis adapter successfully initialized.");
      return true;
    } catch (err) {
      this.logger.error(`Failed to initialize Redis adapter: ${err.message}. Falling back to default in-memory adapter.`);
      return false;
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
