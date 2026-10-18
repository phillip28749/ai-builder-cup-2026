// Opt-in operator help. Never enable from a browser URL or local storage.
export const showDeveloperSetup = () => process.env.SHOW_DEVELOPER_SETUP === "true";
