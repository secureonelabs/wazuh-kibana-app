export class AppUpdaterNotFoundError extends Error {
  constructor(appId: string) {
    super(
      i18n.translate('errors.appUpdater.NotFound', {
        defaultMessage: `AppUpdater for ${appId} not found`,
      }),
    );
    this.name = 'AppUpdaterNotFoundError';
  }
}
