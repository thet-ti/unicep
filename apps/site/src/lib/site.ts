import corePackage from '@unicep/core/package.json';

/** The site always documents and runs the exact @unicep/core version from this repository. */
export const version: string = corePackage.version;
export const repositoryUrl = 'https://github.com/thet-ti/unicep';
export const npmUrl = `https://www.npmjs.com/package/@unicep/core/v/${version}`;
export const thetUrl = 'https://thet.dev';
