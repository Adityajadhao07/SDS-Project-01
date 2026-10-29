// ADMINISTRATORS - the only place admins can be added.
// There is no admin sign-up on the website. To add one:
//   1. node scripts/hash-password.js "their-password"
//   2. paste a new entry below, commit, and redeploy.
// The default account below (admin / Admin@SDS2026) is for first login: replace it before sharing the site.
module.exports = [
  { username: "admin", name: "Venue Administrator", passwordHash: "c3c8c3975153fb4c33e523d025cbadac:7b7b8e68aea3cc3ad8d3a351d0385765e43550a80fc862e556968049b8eeb88d44a59b6d9293ed99758a65e54e904ad06bc8790b7fddc67106e871e5b9ddc7d3" },
];
