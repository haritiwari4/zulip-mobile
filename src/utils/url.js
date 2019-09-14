/* @flow strict-local */
import urlRegex from 'url-regex';

import type { Auth } from '../types';
import { getAuthHeaders } from '../api/transport';

/**
 * An object `encodeParamsForUrl` can flatten.
 *
 * In principle the values should be strings; but we include some other
 * primitive types for which `toString` is just as good as `JSON.stringify`.
 */
export type UrlParams = $ReadOnly<{ [string]: string | boolean | number }>;

/** Encode parameters as if for the URL query-part submitting an HTML form. */
export const encodeParamsForUrl = (params: UrlParams): string =>
  Object.keys(params)
    // An `undefined` can sneak in because `JSON.stringify(undefined)` is
    // `undefined`, but its signature lies that it returns just `string`.
    .filter((key: string) => params[key] !== undefined)
    .map(
      (key: string) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key].toString())}`,
    )
    .join('&');

export const getFullUrl = (url: string = '', realm: string): string =>
  !url.startsWith('http') ? `${realm}${url.startsWith('/') ? '' : '/'}${url}` : url;

export const isUrlOnRealm = (url: string = '', realm: string): boolean =>
  url.startsWith('/') || url.startsWith(realm) || !/^(http|www.)/i.test(url);

const getResourceWithAuth = (uri: string, auth: Auth) => ({
  uri: getFullUrl(uri, auth.realm),
  headers: getAuthHeaders(auth),
});

const getResourceNoAuth = (uri: string) => ({
  uri,
});

export const getResource = (
  uri: string,
  auth: Auth,
): {| uri: string, headers?: { [string]: string } |} =>
  isUrlOnRealm(uri, auth.realm) ? getResourceWithAuth(uri, auth) : getResourceNoAuth(uri);

const protocolRegex = /^\s*((?:http|https):\/\/)(.*)$/;

/** DEPRECATED */
const hasProtocol = (url: string = '') => url.search(protocolRegex) !== -1;

// Split a (possible) URL into protocol and non-protocol parts.
// The former will be null if no recognized protocol is a component
// of the string.
//
// Ignores initial spaces.
/** PRIVATE -- exported only for testing */
export const parseProtocol = (value: string): [string | null, string] => {
  const match = protocolRegex.exec(value);
  return match ? [match[1], match[2]] : [null, value];
};

/** DEPRECATED */
export const fixRealmUrl = (url: string = '') => {
  if (url === '') {
    return '';
  }
  const trimmedUrl = url
    .replace(/\s/g, '') // strip any spaces, internal or otherwise
    .replace(/\/$/g, ''); // eliminate trailing slash

  return hasProtocol(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
};

export const getFileExtension = (filename: string): string => filename.split('.').pop();

export const isUrlAnImage = (url: string): boolean =>
  ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(getFileExtension(url).toLowerCase());

const mimes = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  mov: 'video/quicktime',
};

export const getMimeTypeFromFileExtension = (extension: string): string =>
  mimes[extension.toLowerCase()] || 'application/octet-stream';

export const isValidUrl = (url: string): boolean => urlRegex({ exact: true }).test(url);

export type AutocompletionDefaults = {|
  protocol: string,
  domain: string,
|};

export type AutocompletionPieces = [string | null, string, string | null];

/**
 * Given user input purporting to identify a Zulip realm, provide a prefix,
 * derived value, and suffix which may suffice to turn it into a full URL.
 *
 * Presently, the derived value will always be equal to the input value;
 * this property should not be relied on, as it may change in future.
 */
export const autocompleteRealmPieces = (
  value: string,
  defaults: AutocompletionDefaults,
): AutocompletionPieces => {
  const [protocol, nonProtocolValue] = parseProtocol(value);

  const prefix = protocol === null ? defaults.protocol : null;

  const suffix = nonProtocolValue.includes('.') ? null : `.${defaults.domain}`;

  return [prefix, value, suffix];
};

export const autocompleteRealm = (value: string, data: AutocompletionDefaults): string =>
  value === ''
    ? ''
    : autocompleteRealmPieces(value, data)
        .filter(s => s)
        .join('');
