import React from 'react';
import { API_USER_STATUS_RUN_AS } from '../common/api-user-status-run-as';
import { Configuration } from '../common/services/configuration';
import { ServerSecurity, ServerSecuritySetupReturn } from './services';
import { TableDataProps } from './components';
import { UseStateStorageHook } from './hooks';
import { UseDockedSideNav } from './hooks/use-docked-side-nav';
import { HTTPClient } from './services/http/types';
import { ServerDataProps } from './services/http/ui/components/types';
import {
  DashboardSecurityService,
  DashboardSecurityServiceSetupReturn,
} from './services/dashboard-security';

export interface WazuhCorePluginSetup {
  utils: { formatUIDate: (date: Date) => string };
  API_USER_STATUS_RUN_AS: API_USER_STATUS_RUN_AS;
  configuration: Configuration;
  dashboardSecurity: DashboardSecurityService;
  http: HTTPClient;
  serverSecurity: ServerSecurity;
  hooks: {
    useDockedSideNav: () => boolean;
  } & DashboardSecurityServiceSetupReturn['hooks'] &
    ServerSecuritySetupReturn['hooks'];
  hocs: {} & DashboardSecurityServiceSetupReturn['hocs'] &
    ServerSecuritySetupReturn['hocs'];
  ui: {
    TableData: <T>(
      prop: TableDataProps<T>,
    ) => React.ComponentType<TableDataProps<T>>;
    SearchBar: (prop: any) => React.ComponentType<any>;
    ServerTable: <T>(
      prop: ServerDataProps<T>,
    ) => React.ComponentType<ServerDataProps<T>>;
  } & ServerSecuritySetupReturn['ui'];
}

export interface WazuhCorePluginStart {
  utils: { formatUIDate: (date: Date) => string };
  API_USER_STATUS_RUN_AS: API_USER_STATUS_RUN_AS;
  configuration: Configuration;
  dashboardSecurity: DashboardSecurityService;
  http: HTTPClient;
  serverSecurity: ServerSecurity;
  hooks: {
    useDockedSideNav: UseDockedSideNav;
    useStateStorage: UseStateStorageHook; // TODO: enhance
  } & DashboardSecurityServiceSetupReturn['hooks'] &
    ServerSecuritySetupReturn['hooks'];
  hocs: {} & DashboardSecurityServiceSetupReturn['hocs'] &
    ServerSecuritySetupReturn['hocs'];
  ui: {
    TableData: <T>(
      prop: TableDataProps<T>,
    ) => React.ComponentType<TableDataProps<T>>;
    SearchBar: (prop: any) => React.ComponentType<any>;
    ServerTable: <T>(
      prop: ServerDataProps<T>,
    ) => React.ComponentType<ServerDataProps<T>>;
  } & ServerSecuritySetupReturn['ui'];
}

export type AppPluginStartDependencies = object;
