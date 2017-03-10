import NodeRSA from 'node-rsa';
import { LICENSE_FILE } from './Environment';
import { logger } from './Global';
import { readFile, writeFile } from '../util/io';

import KEY_DATA from '../../config/key.json';

export default class LicenseManager {
    constructor() {
        this.license = null;
        this.key = new NodeRSA(KEY_DATA);
    }

    load() {
        return readFile(LICENSE_FILE)
            .then(data => {
                this.license = JSON.parse(this.key.decryptPublic(data).toString());

                logger.log('License found:', this.license);
            })
            .catch(error => {
                if (error.message.indexOf('ENOENT') > -1) {
                    logger.log('License not found.');
                }
                else {
                    logger.error(error.message);
                }
            });
    }

    save(data) {
        return writeFile(LICENSE_FILE, data)
            .then(() => {
                logger.log('License file saved.');
            })
            .catch(error => {
                logger.error(error.message);
            });
    }

    info() {
        return this.license;
    }

    check() {
        return this.license !== null;
    }
}