/*
 * Wazuh app - Module to update the configuration file
 * Copyright (C) 2015-2019 Wazuh, Inc.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * Find more information about this on the LICENSE file.
 */
import fs from 'fs';
import yml from 'js-yaml';
import path from 'path';
import { log } from '../logger';

export class ManageHosts {
  constructor() {
    this.busy = false;
    this.file = path.join(__dirname, '../../wazuh-hosts.yml');
  }


  /**
   * Composes the host structure
   * @param {Object} host 
   * @param {String} id 
   */
  composeHost(host, id) {
    try {
      log('manage-hosts:composeHost', 'Composing host', 'debug');
      return `  - ${!id ? new Date().getTime() : id}:
      url: ${host.url}
      port: ${host.port}
      user: ${host.username || host.user}
      password: ${host.password}`;
    } catch (error) {
      log('manage-hosts:composeHost', error.message || error);
      throw error;
    }
  }

  /**
   * Regex to build the host
   * @param {Object} host 
   */
  composeRegex(host) {
    try {
      const hostId = Object.keys(host)[0];
      const reg = `\\s*-\\s*${hostId}\\s*:\\s*\\n*\\s*url\\s*:\\s*\\S*\\s*\\n*\\s*port\\s*:\\s*\\S*\\s*\\n*\\s*user\\s*:\\s*\\S*\\s*\\n*\\s*password\\s*:\\s*\\S*`
      log('manage-hosts:composeRegex', 'Composing regex', 'debug');
      return new RegExp(`${reg}`, 'gm');
    } catch (error) {
      log('manage-hosts:composeRegex', error.message || error);
      throw error;
    }
  }

  /**
   * Returns the hosts in the wazuh-hosts.yml
   */
  async getHosts() {
    try {
      if (this.busy) {
        throw new Error('Another process is updating the configuration file');
      }
      this.busy = true;
      const raw = fs.readFileSync(this.file, { encoding: 'utf-8' });
      this.busy = false;
      const hosts = yml.load(raw);
      log('manage-hosts:getHosts', 'Getting hosts', 'debug');
      const entries = (hosts || {})['wazuh.hosts'] || [];
      return entries;
    } catch (error) {
      this.busy = false;
      log('manage-hosts:getHosts', error.message || error);
      return Promise.reject(error);
    }
  }

  /**
   * Returns the IDs of the current hosts in the wazuh-hosts.yml
   */
  async getCurrentHostsIds() {
    try {
      const hosts = await this.getHosts();
      const ids = hosts.map(h => {return Object.keys(h)[0]})
      log('manage-hosts:getCurrentHostsIds', 'Getting hosts ids', 'debug');
      return ids;
    } catch (error) {
      log('manage-hosts:getCurrentHostsIds', error.message || error);
      return Promise.reject(error);
    }
  }

  /**
   * Get host by id
   * @param {String} id 
   */
  async getHostById(id) {
    try {
      log('manage-hosts:getHostById', `Getting host ${id}`, 'debug');
      const hosts = await this.getHosts();
      const host = hosts.filter(h => { return Object.keys(h)[0] == id });
      return host[0];
    } catch (error) {
      log('manage-hosts:getHostById', error.message || error);
      return Promise.reject(error);
    }
  }

  /**
   * Decodes the API password
   * @param {String} password 
   */
  decodeApiPassword(password) {
    return Buffer.from(
      password,
      'base64'
    ).toString('ascii');
  }

  /**
   *  Iterate the array with the API entries in given from the .wazuh index in order to create a valid array
   * @param {Object} apiEntries 
   */
  transformIndexedApis(apiEntries) {
    const entries = [];
    try {
      apiEntries.map(entry => {
        const id = entry._id;
        const host = entry._source;
        const api = {
          id: id,
          url: host.url,
          port: host.api_port,
          user: host.api_user,
          password: this.decodeApiPassword(host.api_password)
        };
        entries.push(api);
      });
      log('manage-hosts:transformIndexedApis', 'Transforming index API schedule to config.yml', 'debug');
    } catch (error) {
      log('manage-hosts:transformIndexedApis', error.message || error);
      throw error;
    }
    return entries;
  }


  /**
  * Calls transformIndexedApis() to get the entries to migrate and after that calls addSeveralHosts()
  * @param {Object} apiEntries 
  */
  async migrateFromIndex(apiEntries) {
    try {
      const apis = this.transformIndexedApis(apiEntries);
      return await this.addSeveralHosts(apis);
    } catch (error) {
      log('manage-hosts:migrateFromIndex', error.message || error);
      return Promise.reject(error);
    }
  }

  /**
   * Receives an array of hosts and checks if any host is already in the wazuh-hosts.yml, in this case is removed from the received array and returns the resulting array
   * @param {Array} hosts 
   */
  async cleanExistingHosts(hosts) {
    try {
      const currentHosts = await this.getCurrentHostsIds();
      const cleanHosts = hosts.filter(h => {return !currentHosts.includes(h.id)});
      log('manage-hosts:cleanExistingHosts', 'Preventing add existings hosts', 'debug');
      return cleanHosts;
    } catch (error) {
      log('manage-hosts:cleanExistingHosts', error.message || error);
      return Promise.reject(error);
    }
    
  }

  /**
   * Recursive function used to add several APIs entries
   * @param {Array} hosts 
   */
  async addSeveralHosts(hosts) {
    try {
      const hostToAdd = await this.cleanExistingHosts(hosts);
      log('manage-hosts:addSeveralHosts', 'Adding several', 'debug');
      const entry = hostToAdd.shift();
      const response = await this.addHost(entry);
      if (hostToAdd.length && response) {
        await this.addSeveralHosts(hostToAdd);
      } else {
        return 'All APIs entries were migrated to the config.yml'
      }
    } catch (error) {
      log('manage-hosts:addSeveralHosts', error.message || error);
      return Promise.reject(error);
    }
  }

  /**
   * Add a single host
   * @param {Obeject} host 
   */
  async addHost(host) {
    const id = host.id || new Date().getTime();
    const compose = this.composeHost(host, id);
    let data = await fs.readFileSync(this.file, { encoding: 'utf-8' });
    try {
      if (this.busy) {
        throw new Error('Another process is updating the configuration file');
      }
      const hosts = await this.getHosts() || [];
      this.busy = true;
      if (!hosts.length) {
        const result = `${data}\nwazuh.hosts:\n${compose}\n`;
        await fs.writeFileSync(this.file, result, 'utf8');
        data = await fs.readFileSync(this.file, { encoding: 'utf-8' });
      } else {
        const lastHost = (hosts || []).pop();
        if (lastHost) {
          const lastHostObject = this.composeHost(lastHost[Object.keys(lastHost)[0]], Object.keys(lastHost)[0]);
          const regex = this.composeRegex(lastHost);
          const replace = data.replace(regex, `\n${lastHostObject}\n${compose}\n`)
          await fs.writeFileSync(this.file, replace, 'utf8');
        }
      }
      this.busy = false;
      log('manage-hosts:addHost', `Host ${id} was properly added`, 'debug');
      return id;
    } catch (error) {
      this.busy = false;
      log('manage-hosts:addHost', error.message || error);
      return Promise.reject(error);
    }
  }

  /**
   * Delete a host from the wazuh-hosts.yml
   * @param {Object} req
   */
  async deleteHost(req) {
    let data = await fs.readFileSync(this.file, { encoding: 'utf-8' });
    try {
      if (this.busy) {
        throw new Error('Another process is updating the configuration file');
      }
      const hosts = await this.getHosts() || [];
      this.busy = true;
      if (!hosts.length) {
        throw new Error('There are not configured hosts.');
      } else {
        const hostsNumber = hosts.length;
        const target = (hosts || []).find((element) => {
          return Object.keys(element)[0] === req.params.id;
        });
        if (!target) {
          throw new Error(`Host ${req.params.id} not found.`);
        }
        const regex = this.composeRegex(target);
        const result = data.replace(regex, ``)
        await fs.writeFileSync(this.file, result, 'utf8');
        if (hostsNumber === 1) {
          data = await fs.readFileSync(this.file, { encoding: 'utf-8' });
          const clearHosts = data.replace(new RegExp(`wazuh.hosts:\\s*[\\n\\r]`, 'gm'), '')
          await fs.writeFileSync(this.file, clearHosts, 'utf8');
        }
      }
      this.busy = false;
      log('manage-hosts:deleteHost', `Host ${req.params.id} was properly deleted`, 'debug');
      return true;
    } catch (error) {
      this.busy = false;
      log('manage-hosts:deleteHost', error.message || error);
      return Promise.reject(error);
    }
  }

  /**
   * Updates the hosts information
   * @param {String} id 
   * @param {Object} host 
   */
  async updateHost(id, host) {
    let data = await fs.readFileSync(this.file, { encoding: 'utf-8' });
    try {
      if (this.busy) {
        throw new Error('Another process is updating the configuration file');
      }
      const hosts = await this.getHosts() || [];
      this.busy = true;
      if (!hosts.length) {
        throw new Error('There are not configured hosts.');
      } else {
        const target = (hosts || []).find((element) => {
          return Object.keys(element)[0] === id;
        });
        if (!target) {
          throw new Error(`Host ${id} not found.`);
        }
        const regex = this.composeRegex(target);
        const result = data.replace(regex, `\n${this.composeHost(host, id)}`);
        await fs.writeFileSync(this.file, result, 'utf8');
      }
      this.busy = false;
      log('manage-hosts:updateHost', `Host ${id} was properly updated`, 'debug');
      return true;
    } catch (error) {
      this.busy = false;
      log('manage-hosts:updateHost', error.message || error);
      return Promise.reject(error);
    }
  }
}
