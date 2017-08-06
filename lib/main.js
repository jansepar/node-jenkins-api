'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var util = require('util');
var qs = require('querystring');
var request = require('request');

var API = '/api/json';
var LIST = API;
var CREATE = '/createItem' + API;

var BUILD_START = '/job/%s/build' + API;
var BUILD_START_WITHPARAMS = '/job/%s/buildWithParameters'; // TODO how to handle this?
var BUILD_STOP = '/job/%s/%s/stop';
var BUILD_INFO = '/job/%s/%s' + API;
var BUILD_DELETE = '/job/%s/%s/doDelete';

var ALL_BUILDS = '/job/%s' + API + '?tree=allBuilds[%s]';
var LAST_SUCCESS = '/job/%s/lastSuccessfulBuild' + API;
var TEST_REPORT = '/job/%s/%s/testReport' + API;
var LAST_BUILD = '/job/%s/lastBuild' + API;
var LAST_COMPLETED_BUILD = '/job/%s/lastCompletedBuild' + API;
// const LAST_REPORT = '/job/%s/lastBuild' + API; //TODO is there url for lastTestReport?

var COMPUTERS = '/computer' + API;

var VIEW_LIST = LIST;
var VIEW_INFO = '/view/%s' + API;
var VIEW_CREATE = '/createView' + API;
var VIEW_CONFIG = '/view/%s/configSubmit'; // NOTE form encoded not called via /api/json, TODO fix
var VIEW_DELETE = '/view/%s/doDelete' + API;
var VIEW_ADD_JOB = '/view/%s/addJobToView' + API;
var VIEW_REMOVE_JOB = '/view/%s/removeJobFromView' + API;

var JOB_LIST = LIST;
var JOB_CREATE = CREATE;
var JOB_INFO = '/job/%s' + API;
var JOB_CONFIG = '/job/%s/config.xml' + API;
var JOB_OUTPUT = '/job/%s/%s/consoleText' + API;
var JOB_DELETE = '/job/%s/doDelete' + API;
var JOB_DISABLE = '/job/%s/disable';
var JOB_ENABLE = '/job/%s/enable';

var QUEUE = '/queue' + API;
var QUEUE_ITEM = '/queue/item/%s' + API;
var QUEUE_CANCEL_ITEM = '/queue/cancelItem' + API; // TODO verify this works with API

var PLUGINS = '/pluginManager' + API;
var INSTALL_PLUGIN = '/pluginManager/installNecessaryPlugins' + API;

var NEWFOLDER = CREATE;

var HTTP_CODE_200 = 200;
var HTTP_CODE_201 = 201;
var HTTP_CODE_302 = 302;

// -----------------------------------------------------------------------------
//   Helper Functions

/**
 * @param {any} value - variable to detect type of.
 * @return {string} - typeof the value param, but 'array' for arrays and 'null' for nulls.
 */
function getType(value) {
  if (Array.isArray(value)) {
    return 'array';
  } else if (value === null) {
    return 'null';
  }
  return typeof value === 'undefined' ? 'undefined' : _typeof(value);
}

/**
 * Processes arguments according to the rules defined by the types array.
 * Types of arguments are checked, optional arguments are replaced by their
 * default values or left undefined.
 *
 * @param {arguments} values: The arguments object.
 * @param {array} types: Array of types, see below.
 * @returns {array} the processed arguments in an array.
 * @throws {Error} if arguments don't fit, throws an error.
 *
 * Examples of types:
 *  ['string']             - function requires one string
 *  ['string', ['number']] - function requires one string and expects an optional number
 *  [['object', {}]]       - function expects an optional object defaulting to empty object
 *  ['string|array']       - function requires string or array
 *
 * Inspired by
 * See: https://www.npmjs.com/package/assert-args
 * See: https://www.npmjs.com/package/ensurethat
 */
function doArgs(values, types) {
  var value = void 0,
      type = void 0,
      carry = void 0,
      optional = void 0,
      defaultValue = void 0;
  var result = [];

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = types[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      type = _step.value;

      // Load value if we don't have one already
      if (!carry) {
        value = Array.prototype.shift.call(values);
      }

      // Handle optional type
      if (Array.isArray(type)) {
        optional = true;
        defaultValue = type[1];
        type = type[0];
      } else {
        optional = false;
      }

      // Handle multitype
      type = type.split('|');

      // Is it a correct value?
      if (type.includes(getType(value))) {
        result.push(value);
        carry = false;
      } else if (optional) {
        result.push(defaultValue);
        carry = true;
      } else {
        throw Error('Invalid arguments');
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  if (values.length) {
    // TODO maybe do some warning..?
    // throw Error('Extra arguments ' + values.length, values);
  }
  return result;
}

/**
 * Parse the passed string as JSON and extract or "manipulate" it using the property.
 *
 * @param {string} body - string response body
 * @param {string|array|function} property - property to get from body or modificator function
 * @param {function} callback function to call when all done
 */
function tryParseJson(body, property, callback) {
  var _doArgs = doArgs(arguments, ['string', 'string|array|function|null', 'function']);

  var _doArgs2 = _slicedToArray(_doArgs, 3);

  body = _doArgs2[0];
  property = _doArgs2[1];
  callback = _doArgs2[2];


  try {
    // Won't harm if we replace escape sequence
    body = body.replace(/\x1b/g, '');

    // Try to parse
    var data = JSON.parse(body.toString());

    // Get the prop name if specified
    if (property) {
      var type = getType(property);

      if (type === 'array') {
        var newData = {};

        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = property[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var p = _step2.value;

            newData[p] = data[p];
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }

        data = newData;
      }
      if (type === 'string') {
        data = data[property];
      }
      if (type === 'function') {
        data = property(data);
      }
    }

    callback(null, data);
  } catch (e) {
    callback(e, body);
  }
}

// -----------------------------------------------------------------------------

exports.init = function (host, defaultOptions, defaultParams) {

  /**
   * Builds the URL to Jenkins from formatstring pattern and params.
   *
   * @param {string} pattern - URL format string patern.
   * @param {string|number} arguments for the formatstring pattern.
   * @returns {string} url - the URL formated according to arguments.
   */
  function formatUrl() {
    return host + util.format.apply(null, arguments);
  }

  /**
   * Build REST params and correctly append them to URL.
   *
   * @param {string} url to be extended with params.
   * @param {object} specificParams key/value pair of params.
   * @returns {string} the extended url.
   */
  var appendParams = function appendParams(url, specificParams) {
    // Assign default and specific parameters
    var params = Object.assign({}, defaultParams, specificParams);

    // Stringify the querystring params
    var paramsString = qs.stringify(params);

    // Empty params
    if (paramsString === '') {
      return url;
    }

    // Does url contain parameters already?
    var delim = url.includes('?') ? '&' : '?';

    return url + delim + paramsString;
  };

  /**
   * Just helper funckion to build the request URL.
   *
   * @param {array<string>} urlPattern array in format of [urlFormat, arg1, arg2] used to build the URL.
   * @param {object} customParams key/value pair of params.
   * @returns {string} the URL built.
   */
  function buildUrl(urlPattern, customParams) {
    var url = formatUrl.apply(null, urlPattern);

    url = appendParams(url, customParams);
    return url;
  }

  /**
   * Run the actual HTTP request.
   *
   * @param {object} specificOptions - options object overriding the default options below.
   * @param {object} customParams - custom url params to be added to url.
   * @param {function} callback - the callback function to be called when request is finished.
   */
  var doRequest = function doRequest(specificOptions, customParams, callback) {

    // Options - Default values
    var options = Object.assign({}, {
      urlPattern: ['/'],
      method: 'GET',
      successStatusCodes: [HTTP_CODE_200],
      failureStatusCodes: [],
      bodyProp: null,
      noparse: false,
      request: {}
    }, defaultOptions, specificOptions);

    // Create the url
    var url = buildUrl(options.urlPattern, customParams);

    // Build the actual request options
    var requestOptions = Object.assign({
      method: options.method,
      url: url,
      headers: [],
      followAllRedirects: true,
      form: null,
      body: null
    }, options.request);

    // Do the request
    request(requestOptions, function (error, response, body) {
      if (error) {
        callback(error, response);
        return;
      }

      if (Array.isArray(options.successStatusCodes) && !options.successStatusCodes.includes(response.statusCode) || Array.isArray(options.failureStatusCodes) && options.failureStatusCodes.includes(response.statusCode)) {
        callback('Server returned unexpected status code: ' + response.statusCode, response);
        return;
      }

      if (options.noparse) {
        // Wrap body in the response object
        if (typeof body === 'string') {
          body = { body: body };
        }

        // Add location
        var location = response.headers.Location || response.headers.location;

        if (location) {
          body.location = location;
        }

        // Add status code
        body.statusCode = response.statusCode;

        callback(null, body);
      } else {
        tryParseJson(body, options.bodyProp, callback);
      }
    });
  };

  return {

    /** ***********************************\
    |*             Builds                *|
    \*************************************/

    /** Trigger Jenkins to build.
     *
     * Return queue location of newly-created job as per
     * https://issues.jenkins-ci.org/browse/JENKINS-12827?focusedCommentId=201381#comment-201381
     */
    build: function build(jobName, customParams, callback) {
      var _doArgs3 = doArgs(arguments, ['string', ['object', {}], 'function']);

      var _doArgs4 = _slicedToArray(_doArgs3, 3);

      jobName = _doArgs4[0];
      customParams = _doArgs4[1];
      callback = _doArgs4[2];


      doRequest({
        method: 'POST',
        urlPattern: [BUILD_START, jobName],
        successStatusCodes: [HTTP_CODE_201, HTTP_CODE_302],
        noparse: true
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }

        var queueIdRe = /\/queue\/item\/(\d+)/;
        var id = +queueIdRe.exec(data.location)[1];

        data.queueId = id;

        callback(null, data);
      });
    },

    /** */
    build_with_params: function build_with_params(jobName, customParams, callback) {
      var _doArgs5 = doArgs(arguments, ['string', ['object', {}], 'function']);

      var _doArgs6 = _slicedToArray(_doArgs5, 3);

      jobName = _doArgs6[0];
      customParams = _doArgs6[1];
      callback = _doArgs6[2];


      doRequest({
        method: 'POST',
        urlPattern: [BUILD_START_WITHPARAMS, jobName],
        successStatusCodes: [HTTP_CODE_201, HTTP_CODE_302],
        noparse: true
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }

        var queueIdRe = /\/queue\/item\/(\d+)/;
        var id = +queueIdRe.exec(data.location)[1];

        data.queueId = id;

        callback(null, data);
      });
    },

    /** */
    stop_build: function stop_build(jobName, buildNumber, customParams, callback) {
      var _doArgs7 = doArgs(arguments, ['string', 'string|number', ['object', {}], 'function']);

      var _doArgs8 = _slicedToArray(_doArgs7, 4);

      jobName = _doArgs8[0];
      buildNumber = _doArgs8[1];
      customParams = _doArgs8[2];
      callback = _doArgs8[3];


      doRequest({
        method: 'POST',
        urlPattern: [BUILD_STOP, jobName, buildNumber],
        noparse: true
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }

        data.body = 'Build ' + buildNumber + ' stopped.';

        callback(null, data);
      });
    },

    /** Get the output for a job's build */
    console_output: function console_output(jobName, buildNumber, customParams, callback) {
      var _doArgs9 = doArgs(arguments, ['string', 'string|number', ['object', {}], 'function']);

      var _doArgs10 = _slicedToArray(_doArgs9, 4);

      jobName = _doArgs10[0];
      buildNumber = _doArgs10[1];
      customParams = _doArgs10[2];
      callback = _doArgs10[3];


      doRequest({
        urlPattern: [JOB_OUTPUT, jobName, buildNumber],
        noparse: true
      }, customParams, callback);
    },

    /** Get information for the last build of a job */
    last_build_info: function last_build_info(jobName, customParams, callback) {
      var _doArgs11 = doArgs(arguments, ['string', ['object', {}], 'function']);

      var _doArgs12 = _slicedToArray(_doArgs11, 3);

      jobName = _doArgs12[0];
      customParams = _doArgs12[1];
      callback = _doArgs12[2];


      doRequest({
        urlPattern: [LAST_BUILD, jobName]
      }, customParams, callback);
    },

    /** Get information for the last completed build of a job */
    last_completed_build_info: function last_completed_build_info(jobName, customParams, callback) {
      var _doArgs13 = doArgs(arguments, ['string', ['object', {}], 'function']);

      var _doArgs14 = _slicedToArray(_doArgs13, 3);

      jobName = _doArgs14[0];
      customParams = _doArgs14[1];
      callback = _doArgs14[2];


      doRequest({
        urlPattern: [LAST_COMPLETED_BUILD, jobName]
      }, customParams, callback);
    },

    /** Get information for the build number of a job */
    build_info: function build_info(jobName, buildNumber, customParams, callback) {
      var _doArgs15 = doArgs(arguments, ['string', 'string|number', ['object', {}], 'function']);

      var _doArgs16 = _slicedToArray(_doArgs15, 4);

      jobName = _doArgs16[0];
      buildNumber = _doArgs16[1];
      customParams = _doArgs16[2];
      callback = _doArgs16[3];


      doRequest({
        urlPattern: [BUILD_INFO, jobName, buildNumber]
      }, customParams, callback);
    },

    /** Get information for the all builds */
    all_builds: function all_builds(jobName, param, customParams, callback) {

      // TODO better name and handle the "param" ???
      var _doArgs17 = doArgs(arguments, ['string', ['string', 'id,timestamp,result,duration'], ['object', {}], 'function']);

      var _doArgs18 = _slicedToArray(_doArgs17, 4);

      jobName = _doArgs18[0];
      param = _doArgs18[1];
      customParams = _doArgs18[2];
      callback = _doArgs18[3];
      doRequest({
        urlPattern: [ALL_BUILDS, jobName, param],
        bodyProp: 'allBuilds'
      }, customParams, callback);
    },

    /** Get the test results for the build number of a job */
    test_result: function test_result(jobName, buildNumber, customParams, callback) {
      var _doArgs19 = doArgs(arguments, ['string', 'string|number', ['object', {}], 'function']);

      var _doArgs20 = _slicedToArray(_doArgs19, 4);

      jobName = _doArgs20[0];
      buildNumber = _doArgs20[1];
      customParams = _doArgs20[2];
      callback = _doArgs20[3];


      doRequest({
        urlPattern: [TEST_REPORT, jobName, buildNumber]
      }, customParams, callback);
    },

    /** Get the last build report for a job.
     * @obsolete Use <code>last_build_info</code> instead.
     * Probly will make this to return the test result. */
    last_build_report: function last_build_report(jobName, customParams, callback) {
      this.last_build_info(jobName, customParams, callback);
      //  doRequest({
      //    urlPattern: [LAST_REPORT, jobName],
      //  }, customParams, callback);
    },

    /** Deletes build data for certain job */
    delete_build: function delete_build(jobName, buildNumber, customParams, callback) {
      var _doArgs21 = doArgs(arguments, ['string', 'string|number', ['object', {}], 'function']);

      var _doArgs22 = _slicedToArray(_doArgs21, 4);

      jobName = _doArgs22[0];
      buildNumber = _doArgs22[1];
      customParams = _doArgs22[2];
      callback = _doArgs22[3];


      doRequest({
        method: 'POST',
        urlPattern: [BUILD_DELETE, jobName, buildNumber],
        noparse: true
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
        } else {
          data.body = 'Build ' + buildNumber + ' deleted.';
          callback(null, data);
        }
      });
    },

    /** ***********************************\
    |*              Jobs                 *|
    \*************************************/

    /** Return a list of object literals containing the name and color of all jobs on the Jenkins server */
    all_jobs: function all_jobs(customParams, callback) {
      var _doArgs23 = doArgs(arguments, [['object', {}], 'function']);

      var _doArgs24 = _slicedToArray(_doArgs23, 2);

      customParams = _doArgs24[0];
      callback = _doArgs24[1];


      doRequest({
        urlPattern: [JOB_LIST],
        bodyProp: 'jobs'
      }, customParams, callback);
    },

    /** Get jobs config in xml */
    get_config_xml: function get_config_xml(jobName, customParams, callback) {
      var _doArgs25 = doArgs(arguments, ['string', ['object', {}], 'function']);

      var _doArgs26 = _slicedToArray(_doArgs25, 3);

      jobName = _doArgs26[0];
      customParams = _doArgs26[1];
      callback = _doArgs26[2];


      doRequest({
        urlPattern: [JOB_CONFIG, jobName],
        noparse: true
      }, customParams, function (error, data) {
        // Get only the XML response body
        if (error) {
          callback(error, data);
        } else {
          callback(null, data.body);
        }
      });
    },

    /** Update a job config xml by passing it through your modifyFunction. */
    update_config: function update_config(jobName, modifyFunction, customParams, callback) {
      var _doArgs27 = doArgs(arguments, ['string', 'function', ['object', {}], 'function']);

      var _doArgs28 = _slicedToArray(_doArgs27, 4);

      jobName = _doArgs28[0];
      modifyFunction = _doArgs28[1];
      customParams = _doArgs28[2];
      callback = _doArgs28[3];


      var self = this;

      self.get_config_xml(jobName, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }

        // Modify the config data
        data = modifyFunction(data);

        self.update_job(jobName, data, customParams, callback);
      });
    },

    /** Update a existing job based on a jobConfig xml string */
    update_job: function update_job(jobName, jobConfig, customParams, callback) {
      var _doArgs29 = doArgs(arguments, ['string', 'string', ['object', {}], 'function']);

      var _doArgs30 = _slicedToArray(_doArgs29, 4);

      jobName = _doArgs30[0];
      jobConfig = _doArgs30[1];
      customParams = _doArgs30[2];
      callback = _doArgs30[3];


      doRequest({
        method: 'POST',
        urlPattern: [JOB_CONFIG, jobName],
        request: {
          body: jobConfig,
          headers: { 'Content-Type': 'application/xml' }
        },
        noparse: true
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }
        // TODO rather return job_info ???
        // const data = {name: jobName, location: response.headers['Location'] || response.headers['location']};
        callback(null, { name: jobName });
      });
    },

    /** Get all information for a job */
    job_info: function job_info(jobName, customParams, callback) {
      var _doArgs31 = doArgs(arguments, ['string', ['object', {}], 'function']);

      var _doArgs32 = _slicedToArray(_doArgs31, 3);

      jobName = _doArgs32[0];
      customParams = _doArgs32[1];
      callback = _doArgs32[2];


      doRequest({
        urlPattern: [JOB_INFO, jobName]
      }, customParams, callback);
    },

    /** Create a new job based on a jobConfig string */
    create_job: function create_job(jobName, jobConfig, customParams, callback) {

      // Set the created job name!
      var _doArgs33 = doArgs(arguments, ['string', 'string', ['object', {}], 'function']);

      var _doArgs34 = _slicedToArray(_doArgs33, 4);

      jobName = _doArgs34[0];
      jobConfig = _doArgs34[1];
      customParams = _doArgs34[2];
      callback = _doArgs34[3];
      customParams.name = jobName;

      var self = this;

      doRequest({
        method: 'POST',
        urlPattern: [JOB_CREATE],
        request: {
          body: jobConfig,
          headers: { 'Content-Type': 'application/xml' }
        },
        noparse: true
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }
        self.job_info(jobName, customParams, callback);
      });
    },

    /** Copies a job and allows you to pass in a function to modify the configuration of the job you would like to copy */
    copy_job: function copy_job(jobName, newJobName, modifyFunction, customParams, callback) {
      var _doArgs35 = doArgs(arguments, ['string', 'string', 'function', ['object', {}], 'function']);

      var _doArgs36 = _slicedToArray(_doArgs35, 5);

      jobName = _doArgs36[0];
      newJobName = _doArgs36[1];
      modifyFunction = _doArgs36[2];
      customParams = _doArgs36[3];
      callback = _doArgs36[4];


      var self = this;

      this.get_config_xml(jobName, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }

        // Modify the data
        data = modifyFunction(data);

        self.create_job(newJobName, data, customParams, callback);
      });
    },

    /** Deletes a job */
    delete_job: function delete_job(jobName, customParams, callback) {
      var _doArgs37 = doArgs(arguments, ['string', ['object', {}], 'function']);

      var _doArgs38 = _slicedToArray(_doArgs37, 3);

      jobName = _doArgs38[0];
      customParams = _doArgs38[1];
      callback = _doArgs38[2];


      doRequest({
        method: 'POST',
        urlPattern: [JOB_DELETE, jobName],
        noparse: true
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }
        callback(null, { name: jobName });
      });
    },

    /** Disables a job */
    disable_job: function disable_job(jobName, customParams, callback) {
      var _doArgs39 = doArgs(arguments, ['string', ['object', {}], 'function']);

      var _doArgs40 = _slicedToArray(_doArgs39, 3);

      jobName = _doArgs40[0];
      customParams = _doArgs40[1];
      callback = _doArgs40[2];


      var self = this;

      doRequest({
        method: 'POST',
        urlPattern: [JOB_DISABLE, jobName],
        noparse: true
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }
        self.job_info(jobName, customParams, callback);
      });
    },

    /** Enables a job */
    enable_job: function enable_job(jobName, customParams, callback) {
      var _doArgs41 = doArgs(arguments, ['string', ['object', {}], 'function']);

      var _doArgs42 = _slicedToArray(_doArgs41, 3);

      jobName = _doArgs42[0];
      customParams = _doArgs42[1];
      callback = _doArgs42[2];


      var self = this;

      doRequest({
        method: 'POST',
        urlPattern: [JOB_ENABLE, jobName],
        noparse: true
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }
        self.job_info(jobName, customParams, callback);
      });
    },

    /** Get the last build report for a job */
    last_success: function last_success(jobName, customParams, callback) {
      var _doArgs43 = doArgs(arguments, ['string', ['object', {}], 'function']);

      var _doArgs44 = _slicedToArray(_doArgs43, 3);

      jobName = _doArgs44[0];
      customParams = _doArgs44[1];
      callback = _doArgs44[2];


      doRequest({
        method: 'POST',
        urlPattern: [LAST_SUCCESS, jobName]
      }, customParams, callback);
    },

    /** Get the last result for a job */
    last_result: function last_result(jobName, customParams, callback) {
      var _doArgs45 = doArgs(arguments, ['string', ['object', {}], 'function']);

      var _doArgs46 = _slicedToArray(_doArgs45, 3);

      jobName = _doArgs46[0];
      customParams = _doArgs46[1];
      callback = _doArgs46[2];


      this.job_info(jobName, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }

        var lastResultUrl = data.lastBuild.url;

        doRequest({
          urlPattern: [lastResultUrl + API, jobName]
        }, customParams, callback);
      });
    },

    /** ***********************************\
    |*              Queues               *|
    \*************************************/

    /** Get all queued items */
    queue: function queue(customParams, callback) {
      var _doArgs47 = doArgs(arguments, [['object', {}], 'function']);

      var _doArgs48 = _slicedToArray(_doArgs47, 2);

      customParams = _doArgs48[0];
      callback = _doArgs48[1];


      doRequest({
        urlPattern: [QUEUE]
      }, customParams, callback);
    },

    /** Get one queued item */
    queue_item: function queue_item(queueNumber, customParams, callback) {
      var _doArgs49 = doArgs(arguments, ['string|number', ['object', {}], 'function']);

      var _doArgs50 = _slicedToArray(_doArgs49, 3);

      queueNumber = _doArgs50[0];
      customParams = _doArgs50[1];
      callback = _doArgs50[2];


      doRequest({
        urlPattern: [QUEUE_ITEM, queueNumber]
      }, customParams, callback);
    },

    /** Cancel a queued item */
    cancel_item: function cancel_item(itemId, customParams, callback) {
      var _doArgs51 = doArgs(arguments, ['string|number', ['object', {}], 'function']);

      var _doArgs52 = _slicedToArray(_doArgs51, 3);

      itemId = _doArgs52[0];
      customParams = _doArgs52[1];
      callback = _doArgs52[2];


      customParams.id = itemId;

      doRequest({
        method: 'POST',
        urlPattern: [QUEUE_CANCEL_ITEM]
      }, customParams, callback);
    },

    /** ***********************************\
    |*            Computers              *|
    \*************************************/

    /** Get info about all jenkins workers including currently executing jobs */
    computers: function computers(customParams, callback) {
      var _doArgs53 = doArgs(arguments, [['object', {}], 'function']);

      var _doArgs54 = _slicedToArray(_doArgs53, 2);

      customParams = _doArgs54[0];
      callback = _doArgs54[1];


      doRequest({
        urlPattern: [COMPUTERS]
      }, customParams, callback);
    },

    /** ***********************************\
    |*              Views                *|
    \*************************************/

    /** Return a list of all the views on the Jenkins server */
    all_views: function all_views(customParams, callback) {
      var _doArgs55 = doArgs(arguments, [['object', {}], 'function']);

      var _doArgs56 = _slicedToArray(_doArgs55, 2);

      customParams = _doArgs56[0];
      callback = _doArgs56[1];


      doRequest({
        urlPattern: [VIEW_LIST],
        bodyProp: 'views'
      }, customParams, callback);
    },

    /** */
    create_view: function create_view(viewName, mode, customParams, callback) {
      var _doArgs57 = doArgs(arguments, ['string', ['string', 'hudson.model.ListView'], ['object', {}], 'function']);

      var _doArgs58 = _slicedToArray(_doArgs57, 4);

      viewName = _doArgs58[0];
      mode = _doArgs58[1];
      customParams = _doArgs58[2];
      callback = _doArgs58[3];


      var formData = { name: viewName, mode: mode };

      formData.json = JSON.stringify(formData);

      var self = this;

      doRequest({
        method: 'POST',
        urlPattern: [VIEW_CREATE],
        request: {
          form: formData
        },
        noparse: true
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }
        self.view_info(viewName, customParams, callback);
      });
    },

    /** */
    view_info: function view_info(viewId, customParams, callback) {
      var _doArgs59 = doArgs(arguments, ['string', ['object', {}], 'function']);

      var _doArgs60 = _slicedToArray(_doArgs59, 3);

      viewId = _doArgs60[0];
      customParams = _doArgs60[1];
      callback = _doArgs60[2];


      doRequest({
        urlPattern: [VIEW_INFO, viewId]
      }, customParams, callback);
    },

    /** Update a view based on a viewConfig object */
    update_view: function update_view(viewName, viewConfig, customParams, callback) {
      var _doArgs61 = doArgs(arguments, ['string', 'object', ['object', {}], 'function']);

      var _doArgs62 = _slicedToArray(_doArgs61, 4);

      viewName = _doArgs62[0];
      viewConfig = _doArgs62[1];
      customParams = _doArgs62[2];
      callback = _doArgs62[3];


      viewConfig.json = JSON.stringify(viewConfig);

      var self = this;

      doRequest({
        method: 'POST',
        urlPattern: [VIEW_CONFIG, viewName],
        request: {
          form: viewConfig
          // headers: {'content-type': 'application/x-www-form-urlencoded'},
        },
        noparse: true
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }
        self.view_info(viewName, customParams, callback);
      });
    },

    /** */
    delete_view: function delete_view(viewName, customParams, callback) {
      var _doArgs63 = doArgs(arguments, ['string', ['object', {}], 'function']);

      var _doArgs64 = _slicedToArray(_doArgs63, 3);

      viewName = _doArgs64[0];
      customParams = _doArgs64[1];
      callback = _doArgs64[2];


      doRequest({
        method: 'POST',
        urlPattern: [VIEW_DELETE, viewName],
        noparse: true
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }
        callback(null, { name: viewName });
      });
    },

    /** */
    add_job_to_view: function add_job_to_view(viewId, jobName, customParams, callback) {
      var _doArgs65 = doArgs(arguments, ['string', 'string', ['object', {}], 'function']);

      var _doArgs66 = _slicedToArray(_doArgs65, 4);

      viewId = _doArgs66[0];
      jobName = _doArgs66[1];
      customParams = _doArgs66[2];
      callback = _doArgs66[3];


      customParams.name = jobName;

      doRequest({
        method: 'POST',
        urlPattern: [VIEW_ADD_JOB, viewId],
        noparse: true
      }, customParams, callback);
    },

    /** */
    remove_job_from_view: function remove_job_from_view(viewId, jobName, customParams, callback) {
      var _doArgs67 = doArgs(arguments, ['string', 'string', ['object', {}], 'function']);

      var _doArgs68 = _slicedToArray(_doArgs67, 4);

      viewId = _doArgs68[0];
      jobName = _doArgs68[1];
      customParams = _doArgs68[2];
      callback = _doArgs68[3];


      customParams.name = jobName;

      doRequest({
        method: 'POST',
        urlPattern: [VIEW_REMOVE_JOB, viewId],
        noparse: true
      }, customParams, callback);
    },

    /* Return a list of objet literals containing the name and color of all the jobs for a view on the Jenkins server */
    all_jobs_in_view: function all_jobs_in_view(viewId, customParams, callback) {
      var _doArgs69 = doArgs(arguments, ['string', ['object', {}], 'function']);

      var _doArgs70 = _slicedToArray(_doArgs69, 3);

      viewId = _doArgs70[0];
      customParams = _doArgs70[1];
      callback = _doArgs70[2];


      doRequest({
        urlPattern: [VIEW_INFO, viewId],
        bodyProp: 'jobs'
      }, customParams, callback);
    },

    /** ***********************************\
    |*             Plugins               *|
    \*************************************/

    /* Get all installed plugins */
    all_installed_plugins: function all_installed_plugins(customParams, callback) {
      var _doArgs71 = doArgs(arguments, [['object', {}], 'function']);

      var _doArgs72 = _slicedToArray(_doArgs71, 2);

      customParams = _doArgs72[0];
      callback = _doArgs72[1];


      customParams.depth = 1;

      doRequest({
        urlPattern: [PLUGINS],
        failureStatusCodes: [HTTP_CODE_302],
        noparse: true,
        bodyProp: 'plugins'
      }, customParams, callback);
    },

    /* Install a plugin */
    install_plugin: function install_plugin(plugin, customParams, callback) {
      var _doArgs73 = doArgs(arguments, ['string', ['object', {}], 'function']);

      var _doArgs74 = _slicedToArray(_doArgs73, 3);

      plugin = _doArgs74[0];
      customParams = _doArgs74[1];
      callback = _doArgs74[2];


      var body = '<jenkins><install plugin="' + plugin + '" /></jenkins>';

      doRequest({
        method: 'POST',
        urlPattern: [INSTALL_PLUGIN],
        request: {
          body: body,
          headers: { 'Content-Type': 'text/xml' }
        },
        noparse: true,
        bodyProp: 'plugins'
      }, customParams, callback);
    },

    /* Create a new folder
     * Needs Folder plugin in Jenkins: https://wiki.jenkins-ci.org/display/JENKINS/CloudBees+Folders+Plugin
     *  curl -XPOST 'http://jenkins/createItem?name=FolderName&mode=com.cloudbees.hudson.plugins.folder.Folder&from=&json=%7B%22name%22%3A%22FolderName%22%2C%22mode%22%3A%22com.cloudbees.hudson.plugins.folder.Folder%22%2C%22from%22%3A%22%22%2C%22Submit%22%3A%22OK%22%7D&Submit=OK' --user user.name:YourAPIToken -H "Content-Type:application/x-www-form-urlencoded"
     *  https://gist.github.com/stuart-warren/7786892
     */
    create_folder: function create_folder(folderName, customParams, callback) {
      var _doArgs75 = doArgs(arguments, ['string', ['object', {}], 'function']);

      var _doArgs76 = _slicedToArray(_doArgs75, 3);

      folderName = _doArgs76[0];
      customParams = _doArgs76[1];
      callback = _doArgs76[2];


      var mode = 'com.cloudbees.hudson.plugins.folder.Folder';

      customParams.name = folderName;
      customParams.mode = mode;
      customParams.Submit = 'OK';

      doRequest({
        method: 'POST',
        urlPattern: [NEWFOLDER]
      }, customParams, callback);
    }
  };
};