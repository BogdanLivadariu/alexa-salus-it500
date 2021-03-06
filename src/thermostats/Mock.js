class Mock {
    constructor(logger, options = {}) {
        this._logger = logger;
        this._targetTemperature = parseInt(process.env.MOCK_TARGET_TEMPERATURE) || 20;
        this._shouldDefer = options.shouldDefer || false;
    }

    async login() {
        this._logger.debug('Logging in...');
    }

    async online() {
        this._logger.debug('Checking device status...');
        return true;
    }

    async device() {
        this._logger.debug('Contacting device...');
        return {
            contactable: true,
            currentTemperature: 19,
            targetTemperature: this._targetTemperature,
            status: this._targetTemperature > 19 ? 'on' : 'off'
        };
    }

    async setTemperature(temp) {
        this._logger.debug(`Setting temp: ${temp}`);
        this._targetTemperature = temp;
    }

    async logout() {
        this._logger.debug('Logging out...');
    }

    async turnWaterOnFor(hours) {
        this._logger.debug(`Boosting water for: ${hours} hours`);
    }

    card() {
        return {
            title: 'Mock Thermostat',
            image: {
                smallImageUrl: 'http://smallimage.url',
                largeImageUrl: 'http://largeimage.url',
            }
        };
    }

    get friendlyName() {
        return 'Mock Thermostat';
    }

    get manufacturerName() {
        return 'Acme Ltd';
    }

    get description() {
        return 'Mock thermostat used for testing';
    }

    get shouldDefer() {
        return this._shouldDefer;
    }
}

module.exports = Mock;