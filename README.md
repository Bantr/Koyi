<h1 align="center">
  <img alt="GitHub Workflow Status" src="https://img.shields.io/github/workflow/status/Bantr/Koyi/Node.js%20CI">
 <img alt="Discord" src="https://img.shields.io/discord/626436103573864448?label=Discord">
 <a href="https://codeclimate.com/github/Bantr/Koyi/test_coverage"><img src="https://api.codeclimate.com/v1/badges/43832e59644ac77ef26f/test_coverage" /></a>
 <a href="https://codeclimate.com/github/Bantr/Koyi/maintainability"><img src="https://api.codeclimate.com/v1/badges/43832e59644ac77ef26f/maintainability" /></a>
  <br>
  <a href="https//bantr.app"><img src="https://bantr.app/static/assets/bantr-icon.png" align="center" alt="Bantr" width="100"></a>
</h1>

This app processes data for Bantr. Reading and parsing demo files, getting API responses from Steam & Faceit, ...

## Releasing a new version

Use the [npm version](https://docs.npmjs.com/cli/version) command on the master branch.

```sh
# MAJOR version when you make incompatible API changes,
npm version major

# MINOR version when you add functionality in a backwards compatible manner, and
npm version minor

# PATCH version when you make backwards compatible bug fixes.
npm version patch
```
