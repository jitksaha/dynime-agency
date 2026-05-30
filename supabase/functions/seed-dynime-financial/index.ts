// Auto-generated thin entry. Real logic lives in _shared/dynime-seed-shard.ts.
import { runShard } from "../_shared/dynime-seed-shard.ts";
Deno.serve((req) => runShard(req, import.meta.url));
