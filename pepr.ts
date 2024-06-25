import { PeprModule } from "pepr";
import cfg from "./package.json";

import { ContextGuardian } from "./capabilities/context-guardian";

new PeprModule(cfg, [ContextGuardian]);
