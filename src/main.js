'use strict';

const util = require('util');
const qs = require('querystring');
const request = require('request');
const url = require('url');

const API = '/api/json';
const LIST = API;
const CREATE = `/createItem${API}`;

const BUILD_START = `/job/%s/build${API}`;
const BUILD_START_WITHPARAMS = '/job/%s/buildWithParameters'; // TODO how to handle this?
const BUILD_STOP = '/job/%s/%s/stop';
const BUILD_INFO = `/job/%s/%s${API}`;
const BUILD_DELETE = '/job/%s/%s/doDelete';

const ALL_BUILDS = `/job/%s${API}?tree=allBuilds[%s]`;
const LAST_SUCCESS = `/job/%s/lastSuccessfulBuild${API}`;
const TEST_REPORT = `/job/%s/%s/testReport${API}`;
const LAST_BUILD = `/job/%s/lastBuild${API}`;
const LAST_COMPLETED_BUILD = `/job/%s/lastCompletedBuild${API}`;
// const LAST_REPORT = '/job/%s/lastBuild' + API; //TODO is there url for lastTestReport?

const COMPUTERS = `/computer${API}`;

const VIEW_LIST = LIST;
const VIEW_INFO = `/view/%s${API}`;
const VIEW_CREATE = `/createView${API}`;
const VIEW_CONFIG = '/view/%s/configSubmit'; // NOTE form encoded not called via /api/json, TODO fix
const VIEW_DELETE = `/view/%s/doDelete${API}`;
const VIEW_ADD_JOB = `/view/%s/addJobToView${API}`;
const VIEW_REMOVE_JOB = `/view/%s/removeJobFromView${API}`;

const JOB_LIST = LIST;
const JOB_CREATE = CREATE;
const JOB_INFO = `/job/%s${API}`;
const JOB_CONFIG = `/job/%s/config.xml${API}`;
const JOB_OUTPUT = `/job/%s/%s/consoleText${API}`;
const JOB_DELETE = `/job/%s/doDelete${API}`;
const JOB_DISABLE = '/job/%s/disable';
const JOB_ENABLE = '/job/%s/enable';

const QUEUE = `/queue${API}`;
const QUEUE_ITEM = `/queue/item/%s${API}`;
const QUEUE_CANCEL_ITEM = `/queue/cancelItem${API}`; // TODO verify this works with API

const PLUGINS = `/pluginManager${API}`;
const INSTALL_PLUGIN = `/pluginManager/installNecessaryPlugins${API}`;

const NEWFOLDER = CREATE;

const HTTP_CODE_200 = 200;
const HTTP_CODE_201 = 201;
const HTTP_CODE_302 = 302;

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
  return typeof value;

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
  let value, type, carry, optional, defaultValue;
  const result = [];

  for (type of types) {
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
  [body, property, callback] = doArgs(arguments, ['string', 'string|array|function|null', 'function']);

  try {
    // Won't harm if we replace escape sequence
    body = body.replace(/\x1b/g, '');

    // Try to parse
    let data = JSON.parse(body.toString());

    // Get the prop name if specified
    if (property) {
      const type = getType(property);

      if (type === 'array') {
        const newData = {};

        for (const p of property) {
          newData[p] = data[p];
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
  const appendParams = function (url, specificParams) {
    // Assign default and specific parameters
    const params = Object.assign({}, defaultParams, specificParams);

    // Stringify the querystring params
    const paramsString = qs.stringify(params);

    // Empty params
    if (paramsString === '') {
      return url;
    }

    // Does url contain parameters already?
    const delim = (url.includes('?') ? '&' : '?');

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
    let url = formatUrl.apply(null, urlPattern);

    url = appendParams(url, customParams);
    return url;
  }


  /**
   * 获取crumb
   */
  function getCrumbData() {
    var uri = url.parse(host)
    var authPattern = uri.auth.split(":");
    var usr = authPattern[0];
    var psd = authPattern[1];

    var romotePath = "/crumbIssuer/api/xml?xpath=concat(//crumbRequestField,%22:%22,//crumb)";
    var path = uri.protocol + "//" + uri.host + romotePath;

    var requestOptions = Object.assign({
      method: "GET",
      url: path,
      headers: {
        'Authorization': 'basic ' + new Buffer(usr + ':' + psd).toString('base64'),
        'Accept-Encoding': 'identity',
      }
    }, {});

    return new Promise(function (resolve, reject) {
      request(requestOptions, function (error, response, body) {
        if (response.statusCode != 200) {
          reject(response.statusMessage);
          return
        }

        var res = {}
        response.rawHeaders.forEach((value) => {
          if (value && value.startsWith("JSESSIONID")) {
            res.JSESSIONID = value.split(";")[0];
          }
        })

        if (response.body && response.body.startsWith("Jenkins-Crumb")) {
          res.crumb = response.body.split(":")[1];
        }
        // console.log(res);
        resolve(res);
      })
    })
  }

  /**
   * jenkins校验，生成header数据，crumbFlag为true时获取crumb数据和session
   * @param {*} customParams 
   * @param {*} func 
   */
  function handleCrumbFlagAndRequest(customParams, func) {
    var headers = { 'Content-Type': 'application/xml;charset=UTF-8' };

    if (customParams.crumbFlag === true) {
      getCrumbData().then(function (crumbData) {
        // console.log(crumbData);
        headers.Cookie = crumbData.JSESSIONID;
        customParams['Jenkins-Crumb'] = crumbData.crumb;
        delete customParams.crumbFlag;
        func(customParams, headers);
      })
        .catch(function () {
          console.log("get crumbData failed.")
        })
    } else {
      func(customParams, headers);
    }
  }

  /**
   * Run the actual HTTP request.
   *
   * @param {object} specificOptions - options object overriding the default options below.
   * @param {object} customParams - custom url params to be added to url.
   * @param {function} callback - the callback function to be called when request is finished.
   */
  const doRequest = function (specificOptions, customParams, callback) {

    // Options - Default values
    const options = Object.assign({}, {
      urlPattern: ['/'],
      method: 'GET',
      successStatusCodes: [HTTP_CODE_200],
      failureStatusCodes: [],
      bodyProp: null,
      noparse: false,
      request: {}
    }, defaultOptions, specificOptions);

    // Create the url
    const url = buildUrl(options.urlPattern, customParams);

    // Build the actual request options
    const requestOptions = Object.assign({
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

      if ((Array.isArray(options.successStatusCodes) && !options.successStatusCodes.includes(response.statusCode))
        || (Array.isArray(options.failureStatusCodes) && options.failureStatusCodes.includes(response.statusCode))) {
        callback(`Server returned unexpected status code: ${response.statusCode}`, response);
        return;
      }

      if (options.noparse) {
        // Wrap body in the response object
        if (typeof body === 'string') {
          body = { body: body };
        }

        // Add location
        const location = response.headers.Location || response.headers.location;

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
     *
     * @param {string} jobName
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    build: function (jobName, customParams, callback) {
      [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          method: 'POST',
          urlPattern: [BUILD_START, jobName],
          successStatusCodes: [HTTP_CODE_201, HTTP_CODE_302],
          noparse: true,
          request: {
            headers
          }
        }, params, function (error, data) {
          if (error) {
            callback(error, data);
            return;
          }

          const queueIdRe = /\/queue\/item\/(\d+)/;
          const id = +queueIdRe.exec(data.location)[1];

          data.queueId = id;

          callback(null, data);
        });
      });

    },

    /**
     *
     * @param {string} jobName
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    build_with_params: function (jobName, customParams, callback) {
      [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          method: 'POST',
          urlPattern: [BUILD_START_WITHPARAMS, jobName],
          successStatusCodes: [HTTP_CODE_201, HTTP_CODE_302],
          noparse: true,
          request: {
            headers
          }
        }, params, function (error, data) {
          if (error) {
            callback(error, data);
            return;
          }

          const queueIdRe = /\/queue\/item\/(\d+)/;
          const id = +queueIdRe.exec(data.location)[1];

          data.queueId = id;

          callback(null, data);
        });
      });

    },

    /**
     *
     * @param {string} jobName
     * @param {string} buildNumber
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    stop_build: function (jobName, buildNumber, customParams, callback) {
      [jobName, buildNumber, customParams, callback] = doArgs(arguments, ['string', 'string|number', ['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          method: 'POST',
          urlPattern: [BUILD_STOP, jobName, buildNumber],
          noparse: true,
          request: {
            headers
          }
        }, params, function (error, data) {
          if (error) {
            callback(error, data);
            return;
          }

          data.body = `Build ${buildNumber} stopped.`;

          callback(null, data);
        });
      });

    },

    /**
     * Get the output for a job's build
     *
     * @param {string} jobName
     * @param {string} buildNumber
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    console_output: function (jobName, buildNumber, customParams, callback) {
      [jobName, buildNumber, customParams, callback] = doArgs(arguments, ['string', 'string|number', ['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          urlPattern: [JOB_OUTPUT, jobName, buildNumber],
          noparse: true,
          request: {
            headers
          }
        }, params, callback);
      });

    },

    /**
     * Get information for the last build of a job
     *
     * @param {string} jobName
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    last_build_info: function (jobName, customParams, callback) {
      [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          urlPattern: [LAST_BUILD, jobName],
          request: {
            headers
          }
        }, params, callback);
      });

    },

    /**
     * Get information for the last completed build of a job
     *
     * @param {string} jobName
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    last_completed_build_info: function (jobName, customParams, callback) {
      [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          urlPattern: [LAST_COMPLETED_BUILD, jobName],
          request: {
            headers
          }
        }, params, callback);
      });

    },

    /**
     * Get information for the build number of a job
     *
     * @param {string} jobName
     * @param {string} buildNumber
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    build_info: function (jobName, buildNumber, customParams, callback) {
      [jobName, buildNumber, customParams, callback] = doArgs(arguments, ['string', 'string|number', ['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          urlPattern: [BUILD_INFO, jobName, buildNumber],
          request: {
            headers
          }
        }, params, callback);
      });

    },

    /**
     * Get information for the all builds
     *
     * @param {string} jobName
     * @param {string} param
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    all_builds: function (jobName, param, customParams, callback) {
      [jobName, param, customParams, callback] = doArgs(arguments, ['string', ['string', 'id,timestamp,result,duration'], ['object', {}], 'function']);

      // TODO better name and handle the "param" ???
      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          urlPattern: [ALL_BUILDS, jobName, param],
          bodyProp: 'allBuilds',
          request: {
            headers
          }
        }, params, callback);
      });

    },

    /**
     * Get the test results for the build number of a job
     *
     * @param {string} jobName
     * @param {string} buildNumber
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    test_result: function (jobName, buildNumber, customParams, callback) {
      [jobName, buildNumber, customParams, callback] = doArgs(arguments, ['string', 'string|number', ['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          urlPattern: [TEST_REPORT, jobName, buildNumber],
          request: {
            headers
          }
        }, params, callback);
      });

    },

    /**
     * Get the last build report for a job.
     * @obsolete Use <code>last_build_info</code> instead.
     * Probly will make this to return the test result.
     *
     * @param {string} jobName
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    last_build_report: function (jobName, customParams, callback) {
      this.last_build_info(jobName, customParams, callback);
      //  doRequest({
      //    urlPattern: [LAST_REPORT, jobName],
      //  }, customParams, callback);
    },

    /**
     * Deletes build data for certain job
     *
     * @param {string} jobName
     * @param {string} buildNumber
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    delete_build: function (jobName, buildNumber, customParams, callback) {
      [jobName, buildNumber, customParams, callback] = doArgs(arguments, ['string', 'string|number', ['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          method: 'POST',
          urlPattern: [BUILD_DELETE, jobName, buildNumber],
          noparse: true,
          request: {
            headers
          }
        }, params, function (error, data) {
          if (error) {
            callback(error, data);
          } else {
            data.body = `Build ${buildNumber} deleted.`;
            callback(null, data);
          }
        });
      });

    },

    /** ***********************************\
    |*              Jobs                 *|
    \*************************************/

    /**
     * Return a list of object literals containing the name and color of all jobs on the Jenkins server
     *
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    all_jobs: function (customParams, callback) {
      [customParams, callback] = doArgs(arguments, [['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          urlPattern: [JOB_LIST],
          bodyProp: 'jobs',
          request: {
            headers
          }
        }, params, callback);
      });

    },

    /**
     * Get jobs config in xml
     *
     * @param {string} jobName
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    get_config_xml: function (jobName, customParams, callback) {
      [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          urlPattern: [JOB_CONFIG, jobName],
          noparse: true,
          request: {
            headers
          }
        }, params, function (error, data) {
          // Get only the XML response body
          if (error) {
            callback(error, data);
          } else {
            callback(null, data.body);
          }
        });
      });

    },

    /**
     * Update a job config xml by passing it through your modifyFunction.
     *
     * @param {string} jobName
     * @param {function} modifyFunction
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    update_config: function (jobName, modifyFunction, customParams, callback) {
      [jobName, modifyFunction, customParams, callback] = doArgs(arguments, ['string', 'function', ['object', {}], 'function']);

      const self = this;

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

    /**
     * Update a existing job based on a jobConfig xml string
     *
     * @param {string} jobName
     * @param {string} jobConfig
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    update_job: function (jobName, jobConfig, customParams, callback) {
      [jobName, jobConfig, customParams, callback] = doArgs(arguments, ['string', 'string', ['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          method: 'POST',
          urlPattern: [JOB_CONFIG, jobName],
          request: {
            body: jobConfig,
            headers
          },
          noparse: true
        }, params, function (error, data) {
          if (error) {
            callback(error, data);
            return;
          }
          // TODO rather return job_info ???
          // const data = {name: jobName, location: response.headers['Location'] || response.headers['location']};
          callback(null, { name: jobName });
        });
      });

    },

    /**
     * Get all information for a job
     *
     * @param {string} jobName
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    job_info: function (jobName, customParams, callback) {
      [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          urlPattern: [JOB_INFO, jobName],
          request: {
            headers
          }
        }, params, callback);
      });

    },

    /**
     * Create a new job based on a jobConfig string
     *
     * @param {string} jobName
     * @param {string} jobConfig
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    create_job: function (jobName, jobConfig, customParams, callback) {
      [jobName, jobConfig, customParams, callback] = doArgs(arguments, ['string', 'string', ['object', {}], 'function']);

      // Set the created job name!
      customParams.name = jobName;

      const self = this;

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          method: 'POST',
          urlPattern: [JOB_CREATE],
          request: {
            body: jobConfig,
            headers
          },
          noparse: true
        }, params, function (error, data) {
          if (error) {
            callback(error, data);
            return;
          }
          self.job_info(jobName, customParams, callback);
        });
      });

    },

    /**
     * Copies a job and allows you to pass in a function to modify the configuration
     * of the job you would like to copy
     *
     * @param {string} jobName
     * @param {string} newJobName
     * @param {function} modifyFunction
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    copy_job: function (jobName, newJobName, modifyFunction, customParams, callback) {
      [jobName, newJobName, modifyFunction, customParams, callback] = doArgs(arguments, ['string', 'string', 'function', ['object', {}], 'function']);

      const self = this;

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

    /**
     * Deletes a job
     *
     * @param {string} jobName
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    delete_job: function (jobName, customParams, callback) {
      [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          method: 'POST',
          urlPattern: [JOB_DELETE, jobName],
          noparse: true,
          request: {
            headers
          }
        }, params, function (error, data) {
          if (error) {
            callback(error, data);
            return;
          }
          callback(null, { name: jobName });
        });
      });

    },

    /**
     * Disables a job
     *
     * @param {string} jobName
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    disable_job: function (jobName, customParams, callback) {
      [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      const self = this;

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          method: 'POST',
          urlPattern: [JOB_DISABLE, jobName],
          noparse: true,
          request: {
            headers
          }
        }, params, function (error, data) {
          if (error) {
            callback(error, data);
            return;
          }
          self.job_info(jobName, customParams, callback);
        });
      });

    },

    /**
     * Enables a job
     *
     * @param {string} jobName
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    enable_job: function (jobName, customParams, callback) {
      [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      const self = this;

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          method: 'POST',
          urlPattern: [JOB_ENABLE, jobName],
          noparse: true,
          request: {
            headers
          }
        }, params, function (error, data) {
          if (error) {
            callback(error, data);
            return;
          }
          self.job_info(jobName, customParams, callback);
        });
      });

    },

    /**
     * Get the last build report for a job
     *
     * @param {string} jobName
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    last_success: function (jobName, customParams, callback) {
      [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          method: 'POST',
          urlPattern: [LAST_SUCCESS, jobName],
          request: {
            headers
          }
        }, params, callback);
      });

    },

    /**
     * Get the last result for a job
     *
     * @param {string} jobName
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    last_result: function (jobName, customParams, callback) {
      [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      this.job_info(jobName, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }

        const lastResultUrl = data.lastBuild.url;

        handleCrumbFlagAndRequest(customParams, function (params, headers) {
          doRequest({
            urlPattern: [lastResultUrl + API, jobName],
            request: {
              headers
            }
          }, params, callback);
        });

      });
    },

    /** ***********************************\
    |*              Queues               *|
    \*************************************/

    /**
     * Get all queued items
     *
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    queue: function (customParams, callback) {
      [customParams, callback] = doArgs(arguments, [['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          urlPattern: [QUEUE],
          request: {
            headers
          }
        }, params, callback);
      });

    },

    /**
     * Get one queued item
     *
     * @param {string} queueNumber
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    queue_item: function (queueNumber, customParams, callback) {
      [queueNumber, customParams, callback] = doArgs(arguments, ['string|number', ['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          urlPattern: [QUEUE_ITEM, queueNumber],
          request: {
            headers
          }
        }, params, callback);
      });

    },

    /**
     * Cancel a queued item
     *
     * @param {string} itemId
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    cancel_item: function (itemId, customParams, callback) {
      [itemId, customParams, callback] = doArgs(arguments, ['string|number', ['object', {}], 'function']);

      customParams.id = itemId;

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          method: 'POST',
          urlPattern: [QUEUE_CANCEL_ITEM],
          request: {
            headers
          }
        }, params, callback);
      });

    },

    /** ***********************************\
    |*            Computers              *|
    \*************************************/

    /**
     * Get info about all jenkins workers including currently executing jobs
     *
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    computers: function (customParams, callback) {
      [customParams, callback] = doArgs(arguments, [['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          urlPattern: [COMPUTERS],
          request: {
            headers
          }
        }, params, callback);
      });

    },

    /** ***********************************\
    |*              Views                *|
    \*************************************/

    /**
     * Return a list of all the views on the Jenkins server
     *
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    all_views: function (customParams, callback) {
      [customParams, callback] = doArgs(arguments, [['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          urlPattern: [VIEW_LIST],
          bodyProp: 'views',
          request: {
            headers
          }
        }, params, callback);
      });

    },

    /**
     *
     * @param {string} viewName
     * @param {string|undefined} mode
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    create_view: function (viewName, mode, customParams, callback) {
      [viewName, mode, customParams, callback] = doArgs(arguments, ['string', ['string', 'hudson.model.ListView'], ['object', {}], 'function']);

      const formData = { name: viewName, mode: mode };

      formData.json = JSON.stringify(formData);

      const self = this;

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          method: 'POST',
          urlPattern: [VIEW_CREATE],
          request: {
            form: formData,
            headers
          },
          noparse: true
        }, params, function (error, data) {
          if (error) {
            callback(error, data);
            return;
          }
          self.view_info(viewName, customParams, callback);
        });
      });

    },

    /**
     * @param {string} viewName
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    view_info: function (viewName, customParams, callback) {
      [viewName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          urlPattern: [VIEW_INFO, viewName],
          request: {
            headers
          }
        }, params, callback);
      });

    },

    /**
     * Update a view based on a viewConfig object
     *
     * @param {string} viewName
     * @param {object} viewConfig
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    update_view: function (viewName, viewConfig, customParams, callback) {
      [viewName, viewConfig, customParams, callback] = doArgs(arguments, ['string', 'object', ['object', {}], 'function']);

      viewConfig.json = JSON.stringify(viewConfig);

      const self = this;

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          method: 'POST',
          urlPattern: [VIEW_CONFIG, viewName],
          request: {
            form: viewConfig,
            headers
          },
          noparse: true
        }, params, function (error, data) {
          if (error) {
            callback(error, data);
            return;
          }
          self.view_info(viewName, customParams, callback);
        });
      });

    },

    /**
     * @param {string} viewName
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    delete_view: function (viewName, customParams, callback) {
      [viewName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          method: 'POST',
          urlPattern: [VIEW_DELETE, viewName],
          noparse: true,
          request: {
            headers
          }
        }, params, function (error, data) {
          if (error) {
            callback(error, data);
            return;
          }
          callback(null, { name: viewName });
        });
      });

    },

    /**
     * @param {string} viewName
     * @param {string} jobName
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    add_job_to_view: function (viewName, jobName, customParams, callback) {
      [viewName, jobName, customParams, callback] = doArgs(arguments, ['string', 'string', ['object', {}], 'function']);

      customParams.name = jobName;

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          method: 'POST',
          urlPattern: [VIEW_ADD_JOB, viewName],
          noparse: true,
          request: {
            headers
          }
        }, params, callback);
      });

    },

    /**
     * @param {string} viewName
     * @param {string} jobName
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    remove_job_from_view: function (viewName, jobName, customParams, callback) {
      [viewName, jobName, customParams, callback] = doArgs(arguments, ['string', 'string', ['object', {}], 'function']);

      customParams.name = jobName;

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          method: 'POST',
          urlPattern: [VIEW_REMOVE_JOB, viewName],
          noparse: true,
          request: {
            headers
          }
        }, params, callback);
      });

    },

    /**
     * Return a list of objet literals containing the name and color of all the jobs for a view on the Jenkins server
     *
     * @param {string} viewName
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    all_jobs_in_view: function (viewName, customParams, callback) {
      [viewName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          urlPattern: [VIEW_INFO, viewName],
          bodyProp: 'jobs',
          request: {
            headers
          }
        }, params, callback);
      });

    },

    /** ***********************************\
    |*             Plugins               *|
    \*************************************/

    /**
     * Get all installed plugins
     *
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    all_installed_plugins: function (customParams, callback) {
      [customParams, callback] = doArgs(arguments, [['object', {}], 'function']);

      customParams.depth = 1;

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          urlPattern: [PLUGINS],
          failureStatusCodes: [HTTP_CODE_302],
          noparse: true,
          bodyProp: 'plugins',
          request: {
            headers
          }
        }, params, callback);
      });

    },

    /**
     * Install a plugin
     *
     * @param {string} pluginName
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    install_plugin: function (pluginName, customParams, callback) {
      [pluginName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      const body = `<jenkins><install plugin="${pluginName}" /></jenkins>`;

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        headers['Content-Type'] = 'text/xml';
        doRequest({
          method: 'POST',
          urlPattern: [INSTALL_PLUGIN],
          request: {
            body: body,
            headers
          },
          noparse: true,
          bodyProp: 'plugins'
        }, params, callback);
      });

    },

    /**
     * Create a new folder with given name
     *
     * Requires Folder plugin in Jenkins:
     * @see https://wiki.jenkins-ci.org/display/JENKINS/CloudBees+Folders+Plugin
     * @see https://gist.github.com/stuart-warren/7786892
     *
     * @param {string} folderName
     * @param {object|undefined} customParams is optional
     * @param {function} callback
     */
    create_folder: function (folderName, customParams, callback) {
      [folderName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      const mode = 'com.cloudbees.hudson.plugins.folder.Folder';

      customParams.name = folderName;
      customParams.mode = mode;
      customParams.Submit = 'OK';

      handleCrumbFlagAndRequest(customParams, function (params, headers) {
        doRequest({
          method: 'POST',
          urlPattern: [NEWFOLDER],
          request: {
            headers
          }
        }, params, callback);
      });

    }
  };
};
