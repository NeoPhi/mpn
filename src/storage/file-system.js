import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import Joi from '@hapi/joi';

import { LOGGER_SCHEMA, BASE_DIRECTORY_SCHEMA } from '../lib/schema';

const NAME = 'file-system';

const OPTIONS_SCHEMA = {
  logger: LOGGER_SCHEMA,
  baseDirectory: BASE_DIRECTORY_SCHEMA,
};

function createDirectory(fileName) {
  return new Promise((resolve, reject) => {
    const dirName = path.dirname(fileName);
    mkdirp(dirName, error => {
      if (error) {
        return reject(error);
      }
      return resolve();
    });
  });
}

export default class FileSystemStorage {
  constructor(options) {
    Joi.assert(options, OPTIONS_SCHEMA);
    this.baseDirectory = options.baseDirectory;
    this.logger = options.logger.child({
      context: NAME,
    });
  }

  _createFullPath(fileName) {
    return path.join(this.baseDirectory, fileName);
  }

  readFile(fileName) {
    const fullPath = this._createFullPath(fileName);
    this.logger.info(fullPath);
    return new Promise((resolve, reject) => {
      fs.readFile(fullPath, (error, data) => {
        if (error) {
          if (error.code === 'ENOENT') {
            this.logger.warn(`${fullPath} not found`);
            return resolve({
              exists: false,
            });
          }
          this.logger.error(error, `${fullPath} error`);
          return reject(error);
        }
        return resolve({
          exists: true,
          data,
        });
      });
    });
  }

  readStream(fileName) {
    const fullPath = this._createFullPath(fileName);
    this.logger.info(fullPath);
    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(fullPath);
      fileStream.on('open', () =>
        resolve({
          exists: true,
          stream: fileStream,
        }),
      );
      fileStream.on('error', error => {
        if (error.code === 'ENOENT') {
          this.logger.warn(`${fullPath} not found`);
          return resolve({
            exists: false,
          });
        }
        this.logger.error(error, `${fullPath} error`);
        return reject(error);
      });
    });
  }

  async writeFile(fileName, data) {
    const fullPath = this._createFullPath(fileName);
    this.logger.info(fullPath);
    return createDirectory(fullPath).then(
      () =>
        new Promise((resolve, reject) => {
          fs.writeFile(fullPath, data, error => {
            if (error) {
              this.logger.error(error, `${fullPath} error`);
              return reject(error);
            }
            return resolve();
          });
        }),
    );
  }
}
