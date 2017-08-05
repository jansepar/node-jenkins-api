'use strict';

const util = require('util');
const qs = require('querystring');
const request = require('request');

const API = '/api/json';
const LIST = API;
const CREATE = '/createItem' + API;

const BUILD_START = '/job/%s/build' + API;
const BUILD_START_WITHPARAMS = '/job/%s/buildWithParameters'; //TODO how to handle this?
const BUILD_STOP = '/job/%s/%s/stop';
const BUILD_INFO = '/job/%s/%s' + API;
const BUILD_DELETE = '/job/%s/%s/doDelete';

const ALL_BUILDS = '/job/%s' + API + '?tree=allBuilds[%s]';
const LAST_SUCCESS = '/job/%s/lastSuccessfulBuild' + API;
const TEST_REPORT = '/job/%s/%s/testReport' + API;
const LAST_BUILD = '/job/%s/lastBuild' + API;
const LAST_COMPLETED_BUILD = '/job/%s/lastCompletedBuild' + API;
const LAST_REPORT = '/job/%s/lastBuild' + API;

const COMPUTERS = '/computer' + API;

const VIEW_LIST = LIST;
const VIEW_INFO = '/view/%s' + API;
const VIEW_CREATE = '/createView' + API;
const VIEW_CONFIG = '/view/%s/configSubmit'; // NOTE form encoded not called via /api/json, TODO fix
const VIEW_DELETE = '/view/%s/doDelete' + API;
const VIEW_ADD_JOB = '/view/%s/addJobToView' + API;
const VIEW_REMOVE_JOB = '/view/%s/removeJobFromView' + API;

const JOB_LIST = LIST;
const JOB_CREATE = CREATE;
const JOB_INFO = '/job/%s' + API;
const JOB_CONFIG = '/job/%s/config.xml' + API;
const JOB_OUTPUT = '/job/%s/%s/consoleText' + API;
const JOB_DELETE = '/job/%s/doDelete' + API;
const JOB_DISABLE = '/job/%s/disable';
const JOB_ENABLE = '/job/%s/enable';

const QUEUE = '/queue' + API;
const QUEUE_ITEM = '/queue/item/%s' + API;
const QUEUE_CANCEL_ITEM = '/queue/cancelItem' + API; //TODO verify this works with API

const PLUGINS = '/pluginManager' + API;
const INSTALL_PLUGIN = '/pluginManager/installNecessaryPlugins' + API;

const NEWFOLDER = CREATE;

// -----------------------------------------------------------------------------
//   Helper Functions

/**
 * Return typeof param, but 'array' for arrays and 'null' for nulls.
 */
function getType(value) {
  if (Array.isArray(value)) {
    return 'array';
  } else if (value === null) {
    return 'null';
  } else {
    return typeof value;
  }
};

/**
 * @param values: Array of arguments
 * @param types: Array of types
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
  var value, type, carry, optional, defaultValue, result = [];

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
    if (type.indexOf(getType(value)) !== -1) {
      result.push(value);
      carry = false;
    } else {
      // Is it optional?
      if (optional) {
        result.push(defaultValue);
        carry = true;
      } else {
        throw Error('Invalid arguments');
      }
    }
  }
  if (values.length) {
    // TODO
    //throw Error('Extra arguments ' + values.length, values);
  }
  return result;
};

/**
 * @param body string response body
 * @param property string|array|function property to get from body or modificator function
 * @param callback function to call when all done
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
        for (let p of property) {
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
};


// -----------------------------------------------------------------------------

const init = exports.init = function (host, defaultOptions, defaultParams) {

  /** Builds REST url to Jenkins */
  function formatUrl(command, ...args) {
    return host + util.format.apply(this, arguments);
  };

  /** Build REST params to allow jenkins to specify additional configuration options */
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
    const delim = (url.indexOf('?') === -1 ? '?' : '&');

    return url + delim + paramsString;
  };

  /** Build the request url */
  function buildUrl(urlPattern, customParams) {
    let url = formatUrl.apply(this, urlPattern);
    url = appendParams(url, customParams);
    return url;
  }

  /** */
  const doRequest = function (specificOptions, customParams, callback) {

    // Options - Default values
    const options = Object.assign({}, {
      urlPattern: ['/'],
      method: 'GET',
      successStatusCodes: [200],
      failureStatusCodes: [],
      bodyProp: null,
      noparse: false,
      request: {},
    }, defaultOptions, specificOptions);

    // Create the url
    const url = buildUrl(options.urlPattern, customParams);

    const requestOptions = Object.assign({
      method: options.method,
      url: url,
      headers: [],
      followAllRedirects: true,
      form: null,
      body: null,
    }, options.request);

    request(requestOptions, function (error, response, body) {
      if (error) {
        callback(error, response);
        return;
      }

      if ((Array.isArray(options.successStatusCodes) && options.successStatusCodes.indexOf(response.statusCode) === -1) ||
        (Array.isArray(options.failureStatusCodes) && options.failureStatusCodes.indexOf(response.statusCode) !== -1)) {
        callback(`Server returned unexpected status code: ${response.statusCode}`, response);
        return;
      }

      if (options.noparse) {
        // Wrap body in the response object
        if (typeof body === 'string') {
          body = { body: body };
        }

        // Add location
        const location = response.headers['Location'] || response.headers['location']
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

    /*************************************\
    |*             Builds                *|
    \*************************************/

    /** Trigger Jenkins to build.
     *
     * Return queue location of newly-created job as per
     * https://issues.jenkins-ci.org/browse/JENKINS-12827?focusedCommentId=201381#comment-201381
     */
    build: function (jobName, customParams, callback) {
          [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      doRequest({
        method: 'POST',
        urlPattern: [BUILD_START, jobName],
        successStatusCodes: [201, 302],
        noparse: true,
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }

        const queueIdRe = /\/queue\/item\/(\d+)/;
        const id = +queueIdRe.exec(data.location)[1];
        data.queueId = id;

        callback(null, data);
      });
    },

    /** */
    build_with_params: function (jobName, customParams, callback) {
          [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      doRequest({
        method: 'POST',
        urlPattern: [BUILD_START_WITHPARAMS, jobName],
        successStatusCodes: [201, 302],
        noparse: true,
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }

        const queueIdRe = /\/queue\/item\/(\d+)/;
        const id = +queueIdRe.exec(data.location)[1];
        data.queueId = id;

        callback(null, data);
      });
    },

    /** */
    stop_build: function (jobName, buildNumber, customParams, callback) {
          [jobName, buildNumber, customParams, callback] = doArgs(arguments, ['string', 'string|number', ['object', {}], 'function']);

      doRequest({
        method: 'POST',
        urlPattern: [BUILD_STOP, jobName, buildNumber],
        noparse: true,
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
    console_output: function (jobName, buildNumber, customParams, callback) {
            [jobName, buildNumber, customParams, callback] = doArgs(arguments, ['string', 'string|number', ['object', {}], 'function']);

      doRequest({
        urlPattern: [JOB_OUTPUT, jobName, buildNumber],
        noparse: true,
      }, customParams, callback);
    },

    /** Get information for the last build of a job */
    last_build_info: function (jobName, customParams, callback) {
            [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      doRequest({
        urlPattern: [LAST_BUILD, jobName],
      }, customParams, callback);
    },

    /** Get information for the last completed build of a job */
    last_completed_build_info: function (jobName, customParams, callback) {
            [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      doRequest({
        urlPattern: [LAST_COMPLETED_BUILD, jobName],
      }, customParams, callback);
    },

    /** Get information for the build number of a job */
    build_info: function (jobName, buildNumber, customParams, callback) {
            [jobName, buildNumber, customParams, callback] = doArgs(arguments, ['string', 'string|number', ['object', {}], 'function']);

      doRequest({
        urlPattern: [BUILD_INFO, jobName, buildNumber],
      }, customParams, callback);
    },

    /** Get information for the all builds */
    all_builds: function (jobName, param, customParams, callback) {
            [jobName, param, customParams, callback] = doArgs(arguments, ['string', ['string', 'id,timestamp,result,duration'], ['object', {}], 'function']);

      // TODO better name and handle the "param" ???
      doRequest({
        urlPattern: [ALL_BUILDS, jobName, param],
        bodyProp: 'allBuilds',
      }, customParams, callback);
    },

    /** Get the test results for the build number of a job */
    test_result: function (jobName, buildNumber, customParams, callback) {
            [jobName, buildNumber, customParams, callback] = doArgs(arguments, ['string', 'string|number', ['object', {}], 'function']);

      doRequest({
        urlPattern: [TEST_REPORT, jobName, buildNumber],
      }, customParams, callback);
    },

    /** Get the last build report for a job */
    last_build_report: function (jobName, customParams, callback) {
            [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      doRequest({
        urlPattern: [LAST_REPORT, jobName],
      }, customParams, callback);
    },

    /** Deletes build data for certain job */
    delete_build: function (jobName, buildNumber, customParams, callback) {
            [jobName, buildNumber, customParams, callback] = doArgs(arguments, ['string', 'string|number', ['object', {}], 'function']);

      doRequest({
        method: 'POST',
        urlPattern: [BUILD_DELETE, jobName, buildNumber],
        noparse: true,
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
        } else {
          data.body = 'Build ' + buildNumber + ' deleted.';
          callback(null, data);
        }
      });
    },

    /*************************************\
    |*              Jobs                 *|
    \*************************************/

    /** Return a list of object literals containing the name and color of all jobs on the Jenkins server */
    all_jobs: function (customParams, callback) {
            [customParams, callback] = doArgs(arguments, [['object', {}], 'function']);

      doRequest({
        urlPattern: [JOB_LIST],
        bodyProp: 'jobs',
      }, customParams, callback);
    },

    /** Get jobs config in xml */
    get_config_xml: function (jobName, customParams, callback) {
            [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      doRequest({
        urlPattern: [JOB_CONFIG, jobName],
        noparse: true,
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
    update_config: function (jobName, modifyFunction, customParams, callback) {
            [jobName, modifyFunction, customParams, callback] = doArgs(arguments, ['string', 'function', ['object', {}], 'function']);

      const self = this;
      self.get_config_xml(jobName, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }

        // Modify the config data
        data = modifyFunction(data)

        self.update_job(jobName, data, customParams, callback);
      });
    },

    /** Update a existing job based on a jobConfig xml string */
    update_job: function (jobName, jobConfig, customParams, callback) {
            [jobName, jobConfig, customParams, callback] = doArgs(arguments, ['string', 'string', ['object', {}], 'function']);

      doRequest({
        method: 'POST',
        urlPattern: [JOB_CONFIG, jobName],
        request: {
          body: jobConfig,
          headers: { 'Content-Type': 'application/xml' },
        },
        noparse: true,
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }
        // TODO rather return job_info ???
        //const data = {name: jobName, location: response.headers['Location'] || response.headers['location']};
        callback(null, { name: jobName });
      });
    },

    /** Get all information for a job */
    job_info: function (jobName, customParams, callback) {
            [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      doRequest({
        urlPattern: [JOB_INFO, jobName],
      }, customParams, callback);
    },

    /** Create a new job based on a jobConfig string */
    create_job: function (jobName, jobConfig, customParams, callback) {
            [jobName, jobConfig, customParams, callback] = doArgs(arguments, ['string', 'string', ['object', {}], 'function']);

      // Set the created job name!
      customParams.name = jobName;

      const self = this;

      doRequest({
        method: 'POST',
        urlPattern: [JOB_CREATE],
        request: {
          body: jobConfig,
          headers: { 'Content-Type': 'application/xml' },
        },
        noparse: true,
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }
        self.job_info(jobName, customParams, callback);
      });
    },

    /** Copies a job and allows you to pass in a function to modify the configuration of the job you would like to copy */
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

    /** Deletes a job */
    delete_job: function (jobName, customParams, callback) {
            [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      doRequest({
        method: 'POST',
        urlPattern: [JOB_DELETE, jobName],
        noparse: true,
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }
        callback(null, { name: jobName });
      });
    },

    /** Disables a job */
    disable_job: function (jobName, customParams, callback) {
            [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      const self = this;
      doRequest({
        method: 'POST',
        urlPattern: [JOB_DISABLE, jobName],
        noparse: true,
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }
        self.job_info(jobName, customParams, callback);
      });
    },

    /** Enables a job */
    enable_job: function (jobName, customParams, callback) {
            [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      const self = this;
      doRequest({
        method: 'POST',
        urlPattern: [JOB_ENABLE, jobName],
        noparse: true,
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }
        self.job_info(jobName, customParams, callback);
      });
    },

    /** Get the last build report for a job */
    last_success: function (jobName, customParams, callback) {
            [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      doRequest({
        method: 'POST',
        urlPattern: [LAST_SUCCESS, jobName],
      }, customParams, callback);
    },

    /** Get the last result for a job */
    last_result: function (jobName, customParams, callback) {
            [jobName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      this.job_info(jobName, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }

        const last_result_url = data.lastBuild.url;

        doRequest({
          urlPattern: [last_result_url + API, jobName],
        }, customParams, callback);
      });
    },

    /*************************************\
    |*              Queues               *|
    \*************************************/

    /** Get all queued items */
    queue: function (customParams, callback) {
            [customParams, callback] = doArgs(arguments, [['object', {}], 'function']);

      doRequest({
        urlPattern: [QUEUE],
      }, customParams, callback);
    },

    /** Get one queued item */
    queue_item: function (queueNumber, customParams, callback) {
            [queueNumber, customParams, callback] = doArgs(arguments, ['string|number', ['object', {}], 'function']);

      doRequest({
        urlPattern: [QUEUE_ITEM, queueNumber],
      }, customParams, callback);
    },

    /** Cancel a queued item */
    cancel_item: function (itemId, customParams, callback) {
            [itemId, customParams, callback] = doArgs(arguments, ['string|number', ['object', {}], 'function']);

      customParams.id = itemId;

      doRequest({
        method: 'POST',
        urlPattern: [QUEUE_CANCEL_ITEM],
      }, customParams, callback);
    },

    /*************************************\
    |*            Computers              *|
    \*************************************/

    /** Get info about all jenkins workers including currently executing jobs */
    computers: function (customParams, callback) {
            [customParams, callback] = doArgs(arguments, [['object', {}], 'function']);

      doRequest({
        urlPattern: [COMPUTERS],
      }, customParams, callback);
    },

    /*************************************\
    |*              Views                *|
    \*************************************/

    /** Return a list of all the views on the Jenkins server */
    all_views: function (customParams, callback) {
            [customParams, callback] = doArgs(arguments, [['object', {}], 'function']);

      doRequest({
        urlPattern: [VIEW_LIST],
        bodyProp: 'views',
      }, customParams, callback);
    },

    /** */
    create_view: function (viewName, mode, customParams, callback) {
            [viewName, mode, customParams, callback] = doArgs(arguments, ['string', ['string', 'hudson.model.ListView'], ['object', {}], 'function']);

      const formData = { name: viewName, mode: mode };
      formData.json = JSON.stringify(formData);

      const self = this;

      doRequest({
        method: 'POST',
        urlPattern: [VIEW_CREATE],
        request: {
          form: formData,
        },
        noparse: true,
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }
        self.view_info(viewName, customParams, callback);
      });
    },

    /** */
    view_info: function (viewId, customParams, callback) {
            [viewId, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      doRequest({
        urlPattern: [VIEW_INFO, viewId],
      }, customParams, callback);
    },

    /** Update a view based on a viewConfig object */
    update_view: function (viewName, viewConfig, customParams, callback) {
            [viewName, viewConfig, customParams, callback] = doArgs(arguments, ['string', 'object', ['object', {}], 'function']);

      viewConfig.json = JSON.stringify(viewConfig);

      const self = this;

      doRequest({
        method: 'POST',
        urlPattern: [VIEW_CONFIG, viewName],
        request: {
          form: viewConfig,
          //headers: {'content-type': 'application/x-www-form-urlencoded'},
        },
        noparse: true,
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }
        self.view_info(viewName, customParams, callback);
      });
    },

    /** */
    delete_view: function (viewName, customParams, callback) {
            [viewName, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      doRequest({
        method: 'POST',
        urlPattern: [VIEW_DELETE, viewName],
        noparse: true,
      }, customParams, function (error, data) {
        if (error) {
          callback(error, data);
          return;
        }
        callback(null, { name: viewName });
      });
    },

    /** */
    add_job_to_view: function (viewId, jobName, customParams, callback) {
            [viewId, jobName, customParams, callback] = doArgs(arguments, ['string', 'string', ['object', {}], 'function']);

      customParams.name = jobName;

      doRequest({
        method: 'POST',
        urlPattern: [VIEW_ADD_JOB, viewId],
        noparse: true,
      }, customParams, callback);
    },

    /** */
    remove_job_from_view: function (viewId, jobName, customParams, callback) {
            [viewId, jobName, customParams, callback] = doArgs(arguments, ['string', 'string', ['object', {}], 'function']);

      customParams.name = jobName;

      doRequest({
        method: 'POST',
        urlPattern: [VIEW_REMOVE_JOB, viewId],
        noparse: true,
      }, customParams, callback);
    },

    /* Return a list of objet literals containing the name and color of all the jobs for a view on the Jenkins server */
    all_jobs_in_view: function (viewId, customParams, callback) {
            [viewId, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      doRequest({
        urlPattern: [VIEW_INFO, viewId],
        bodyProp: 'jobs',
      }, customParams, callback);
    },

    /*************************************\
    |*             Plugins               *|
    \*************************************/

    /* Get all installed plugins */
    all_installed_plugins: function (customParams, allback) {
          [customParams, callback] = doArgs(arguments, [['object', {}], 'function']);

      customParams.depth = 1;

      doRequest({
        urlPattern: [PLUGINS],
        failureStatusCodes: [302],
        noparse: true,
        bodyProp: 'plugins',
      }, customParams, callback);
    },

    /* Install a plugin */
    install_plugin: function (plugin, customParams, callback) {
          [plugin, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      const body = `<jenkins><install plugin="${plugin}" /></jenkins>`;

      doRequest({
        method: 'POST',
        urlPattern: [INSTALL_PLUGIN],
        request: {
          body: body,
          headers: { 'Content-Type': 'text/xml' },
        },
        noparse: true,
        bodyProp: 'plugins',
      }, customParams, callback);
    },

    /* Create a new folder
     * Needs Folder plugin in Jenkins: https://wiki.jenkins-ci.org/display/JENKINS/CloudBees+Folders+Plugin
     *  curl -XPOST 'http://jenkins/createItem?name=FolderName&mode=com.cloudbees.hudson.plugins.folder.Folder&from=&json=%7B%22name%22%3A%22FolderName%22%2C%22mode%22%3A%22com.cloudbees.hudson.plugins.folder.Folder%22%2C%22from%22%3A%22%22%2C%22Submit%22%3A%22OK%22%7D&Submit=OK' --user user.name:YourAPIToken -H "Content-Type:application/x-www-form-urlencoded"
     *  https://gist.github.com/stuart-warren/7786892
     */
    create_folder: function (folderName, customParams, callback) {
            [foldername, customParams, callback] = doArgs(arguments, ['string', ['object', {}], 'function']);

      const mode = 'com.cloudbees.hudson.plugins.folder.Folder';
      customParams.name = folderName;
      customParams.mode = mode;
      customParams.Submit = 'OK';

      doRequest({
        method: 'POST',
        urlPattern: [NEWFOLDER],
      }, customParams, callback);
    },
  }
};

if (!module.parent) {}
