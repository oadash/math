/** Bump when you need to verify Railway serves the latest commit. */
export const API_REVISION = 'deploy-info-3-docker'

export function getDeployInfo() {
  return {
    revision: API_REVISION,
    bootTag: process.env.SERVER_BOOT_TAG ?? null,
    railway: {
      serviceName: process.env.RAILWAY_SERVICE_NAME ?? null,
      serviceId: process.env.RAILWAY_SERVICE_ID ?? null,
      environment: process.env.RAILWAY_ENVIRONMENT ?? null,
      environmentName: process.env.RAILWAY_ENVIRONMENT_NAME ?? null,
      project: process.env.RAILWAY_PROJECT_NAME ?? null,
      commit: process.env.RAILWAY_GIT_COMMIT_SHA ?? null,
      branch: process.env.RAILWAY_GIT_BRANCH ?? null,
    },
  }
}
