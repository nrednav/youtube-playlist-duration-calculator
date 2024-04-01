import { main } from "src/modules/index";
import "./main.css";

// Entry-point
if (document.readyState !== "loading") {
  main();
} else {
  document.addEventListener("DOMContentLoaded", () => {
    main();
  });
}
