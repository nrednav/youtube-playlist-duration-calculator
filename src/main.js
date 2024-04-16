import { main } from "src/modules/index";
import "./main.css";
import { logger } from "./shared/modules/logger";

// Entry-point
if (document.readyState !== "loading") {
  logger.info("Loaded.");
  main();
} else {
  document.addEventListener("DOMContentLoaded", () => {
    logger.info("Loaded.");
    main();
  });
}
