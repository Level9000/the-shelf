// Facts that appear on more than one page. The support address is on the home
// page footer, on /support, and is what App Store Connect's Support URL
// ultimately points people at, so it gets one definition rather than three.

export const SUPPORT_EMAIL = "support@authoredby.app";

export const COMPANY = "Small Machines AI LLC";
export const COMPANY_LOCATION = "Grand Rapids, Michigan";

// Whether the app is actually downloadable yet.
//
// False until it clears App Store review. While it is false the download pill
// stops being a link and opens the launch notice instead, which explains where
// the app is and offers to email the reader when it lands. Flipping this to
// true — with a real APP_STORE_URL beside it — turns all three pills back into
// ordinary links and retires the notice; nothing else has to change.
export const APP_IS_LIVE = false;
