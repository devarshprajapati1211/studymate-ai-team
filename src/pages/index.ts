import { initPage } from "../app";

const user = await initPage();
if (user) location.replace("/dashboard");
