import { main } from "./library/index";
import "./main.css";

// Entry-point
if (document.readyState !== "loading") {
  main();
} else {
  document.addEventListener("DOMContentLoaded", () => {
    main();
  });
}
