const fs = require('fs');
const chai = require('chai');
const expect = chai.expect;

const chaiLike = require('chai-like');
const chaiThings = require('chai-things');

chai.use(chaiLike);
chai.use(chaiThings);

const jenkinsapi = require('../lib/main');
const JENKINS_URL = 'http://localhost:8080';

// var USER = 'jenkins';
// var TOKEN = 'a5af9f12a1723c2a45c4c6bfd88d0044';
// var JENKINS_URL = "http://" + USER + ":" + TOKEN + "@localhost:8080";

const JOB_NAME_TEST = 'asrwqersfdzdraser-test';
const JOB_NAME_NEW = 'asrwqersfdzdraser-test-new';
const JOB_NAME_COPY = 'asrwqersfdzdraser-test-copy';
const JOB_NAME_REPORT = 'asrwqersfdzdraser-test-with-report';

const TEST_CONFIG_XML_FILE = 'test/test_config.xml';
const TEST_WITH_PARAMS_CONFIG_XML_FILE = 'test/test_with_params_config.xml';
const TEST_WITH_REPORT_CONFIG_XML_FILE = 'test/test_with_report_config.xml';
const DEVELOPMENT_PROJECT_XML_CONFIG = '<?xml version="1.0" encoding="UTF-8"?><project><description>development</description></project>';
const ORIGINAL_DESCRIPTION = 'development';
const REPLACED_DESCRIPTION = 'feature';

function log() {
  // console.log.apply(console, arguments);
}

describe('Node Jenkins API', function () {

  let jenkins;

  before(function (done) {

    it('Should exist', function () {
      expect(jenkinsapi).not.to.be.undefined;
      expect(jenkinsapi.init).to.be.a('function');
    });

    jenkins = jenkinsapi.init(JENKINS_URL);

    it('Should create the connection object', function () {
      expect(jenkins).not.to.be.undefined;
    });

    expect(jenkins.delete_job).to.be.a('function');
    expect(jenkins.all_jobs).to.be.a('function');

    jenkins.delete_job(JOB_NAME_TEST, function (error, data) {
      // log('delete_job', JOB_NAME_TEST, { error, data });

      jenkins.delete_job(JOB_NAME_NEW, function (error, data) {
        // log('delete_job', JOB_NAME_NEW, { error, data });

        jenkins.delete_job(JOB_NAME_COPY, function (error, data) {
          // log('delete_job', JOB_NAME_COPY, { error, data });

          fs.readFile(TEST_CONFIG_XML_FILE, 'utf8', function (error, xmlConfig) {
            // log('readFile', { error, xmlConfig });

            jenkins.create_job(JOB_NAME_TEST, xmlConfig, function (error, data) {
              // log('create_job', JOB_NAME_TEST, { error, data });

              jenkins.all_jobs(function (error, data) {
                // log('all_jobs', { error, data });

                expect(error).to.be.null;
                expect(data).to.be.an('array').that.contains.something.like({ name: JOB_NAME_TEST });

                done();

              }); // all_jobs
            }); // create_job

          }); // readFile

        }); // delete_job
      }); // delete_job
    }); // delete_job
  });

  it('Should show all jobs', function (done) {
    expect(jenkins.all_jobs).to.be.a('function');

    jenkins.all_jobs(function (error, data) {
      log('all_jobs', { error, data });

      expect(error).to.be.null;
      expect(data).to.be.an('array').that.contains.something.like({ name: JOB_NAME_TEST });
      done();
    }); // all_jobs
  });


  it('Should read xml of existing job', function (done) {
    expect(jenkins.get_config_xml).to.be.a('function');

    jenkins.get_config_xml(JOB_NAME_TEST, function (error, data) {
      log('get_config_xml', JOB_NAME_TEST, { error, data });
      expect(error).to.be.null;
      expect(data).to.be.a('string').that.contains(ORIGINAL_DESCRIPTION);
      done();
    }); // get_config_xml
  });


  it('Should show job info', function (done) {
    expect(jenkins.job_info).to.be.a('function');

    // Missing jobName parameter
    try {
      jenkins.job_info(function (error, data) {}); // job_info
    } catch (error) {
      expect(error).not.to.be.null;
    }

    jenkins.job_info(JOB_NAME_TEST, function (error, data) {
      log('job_info', JOB_NAME_TEST, { error, data });
      expect(error).to.be.null;
      expect(data).to.be.an('object').like({ name: JOB_NAME_TEST, description: ORIGINAL_DESCRIPTION });
      done();
    }); // job_info
  });


  it('Should create and delete job', function (done) {
    expect(jenkins.create_job).to.be.a('function');
    expect(jenkins.delete_job).to.be.a('function');

    jenkins.create_job(JOB_NAME_NEW, DEVELOPMENT_PROJECT_XML_CONFIG, function (error, data) {
      expect(error).to.be.null;
      expect(data).to.be.an('object').like({ name: JOB_NAME_NEW });

      jenkins.all_jobs(function (error, data) {
        expect(error).to.be.null;
        expect(data).to.be.an('array').that.contains.something.like({ name: JOB_NAME_NEW });

        jenkins.delete_job(JOB_NAME_NEW, function (error, data) {
          expect(error).to.be.null;
          expect(data).to.be.an('object').like({ name: JOB_NAME_NEW });

          jenkins.all_jobs(function (error, data) {
            expect(error).to.be.null;
            expect(data).to.be.an('array').that.does.not.contain.something.like({ name: JOB_NAME_NEW });

            done();

          }); // all_jobs
        }); // delete_job
      }); // all_jobs
    }); // create_job
  });


  it('Should copy job', function (done) {
    expect(jenkins.copy_job).to.be.a('function');

    jenkins.copy_job(JOB_NAME_TEST, JOB_NAME_COPY, function (data) {
      return data.replace(ORIGINAL_DESCRIPTION, REPLACED_DESCRIPTION);
    }, function (error, data) {
      expect(error).to.be.null;
      expect(data).to.be.an('object').like({ name: JOB_NAME_COPY });

      jenkins.get_config_xml(JOB_NAME_COPY, function (error, data) {
        expect(error).to.be.null;
        expect(data).to.be.a('string').that.contains(REPLACED_DESCRIPTION);

        jenkins.delete_job(JOB_NAME_COPY, function (error, data) {
          expect(error).to.be.null;
          done();
        }); // delete_job
      }); // get_config_xml
    }); // copy_job
  });


  it('Should update job config', function (done) {
    expect(jenkins.update_config).to.be.a('function');

    jenkins.copy_job(JOB_NAME_TEST, JOB_NAME_COPY, function (data) {
      return data;
    }, function (error, data) {
      expect(error).to.be.null;

      jenkins.update_config(JOB_NAME_COPY, function (data) {
        return data.replace(ORIGINAL_DESCRIPTION, REPLACED_DESCRIPTION);
      }, function (error, data) {
        expect(error).to.be.null;
        expect(data).to.be.an('object').like({ name: JOB_NAME_COPY });

        jenkins.get_config_xml(JOB_NAME_COPY, function (error, data) {
          expect(error).to.be.null;
          expect(data).to.be.a('string').that.contains(REPLACED_DESCRIPTION);

          jenkins.delete_job(JOB_NAME_COPY, function (error, data) {
            expect(error).to.be.null;
            done();
          }); // delete_job
        }); // get_config_xml
      }); // update_config
    }); // copy_job
  });

  it('Should disable/enable job', function (done) {
    expect(jenkins.disable_job).to.be.a('function');
    expect(jenkins.enable_job).to.be.a('function');

    jenkins.copy_job(JOB_NAME_TEST, JOB_NAME_COPY, function (data) {
      return data;
    }, function (error, data) {
      log('copy_job', JOB_NAME_TEST, JOB_NAME_COPY, { error, data });
      expect(error).to.be.null;

      jenkins.disable_job(JOB_NAME_COPY, function (error, data) {
        log('disable_job', JOB_NAME_COPY, { error, data });
        expect(error).to.be.null;
        expect(data).to.be.an('object').like({ name: JOB_NAME_COPY, color: 'disabled', buildable: false });

        jenkins.enable_job(JOB_NAME_COPY, function (error, data) {
          log('enable_job', JOB_NAME_COPY, { error, data });
          expect(error).to.be.null;
          expect(data).to.be.an('object').like({ name: JOB_NAME_COPY }).and.not.like({ color: 'disabled' });

          jenkins.delete_job(JOB_NAME_COPY, function (error, data) {
            log('delete_job', JOB_NAME_COPY, { error, data });
            expect(error).to.be.null;
            done();
          }); // delete_job
        }); // get_config_xml
      }); // update_config
    }); // copy_job
  });


  const TEST_VIEW_NAME = 'ewoiurewlkjr-test-view';
  const TEST_VIEW_MODE = 'ewoiurewlkjr-test-view-mode';
  const TEST_VIEW_CONF = {
    name: TEST_VIEW_NAME,
    description: `This is the ${TEST_VIEW_NAME} job-in-jenkins View`,
    statusFilter: '',
    'job-in-jenkins': true,
    useincluderegex: true,
    includeRegex: 'prefix.*',
    columns: [{ 'stapler-class': 'hudson.views.StatusColumn', $class: 'hudson.views.StatusColumn' }, { 'stapler-class': 'hudson.views.WeatherColumn', $class: 'hudson.views.WeatherColumn' }, { 'stapler-class': 'hudson.views.JobColumn', $class: 'hudson.views.JobColumn' }, { 'stapler-class': 'hudson.views.LastSuccessColumn', $class: 'hudson.views.LastSuccessColumn' }, { 'stapler-class': 'hudson.views.LastFailureColumn', $class: 'hudson.views.LastFailureColumn' }, { 'stapler-class': 'hudson.views.LastDurationColumn', $class: 'hudson.views.LastDurationColumn' }, { 'stapler-class': 'hudson.views.BuildButtonColumn', $class: 'hudson.views.BuildButtonColumn' }]
  };

  it('Should CRUD a view', function (done) {
    expect(jenkins.create_view).to.be.a('function');
    expect(jenkins.view_info).to.be.a('function');
    expect(jenkins.all_views).to.be.a('function');
    expect(jenkins.update_view).to.be.a('function');
    expect(jenkins.delete_view).to.be.a('function');

    jenkins.delete_view(TEST_VIEW_NAME, function (error, data) {
      // NOTE ignoring error

      jenkins.create_view(TEST_VIEW_NAME, function (error, data) {
        log('create_view', TEST_VIEW_NAME, { error, data });
        expect(error).to.be.null;
        expect(data).to.be.an('object').like({ name: TEST_VIEW_NAME });

        jenkins.view_info(TEST_VIEW_NAME, function (error, data) {
          log('view_info', { error, data });
          expect(error).to.be.null;
          expect(data).to.be.an('object').like({ name: TEST_VIEW_NAME });

          jenkins.all_views(function (error, data) {
            log('all_views', { error, data });
            expect(error).to.be.null;
            expect(data).to.be.an('array').that.contains.something.like({ name: TEST_VIEW_NAME });

            jenkins.update_view(TEST_VIEW_NAME, TEST_VIEW_CONF, function (error, data) {
              log('update_view', TEST_VIEW_NAME, TEST_VIEW_CONF, { error, data });
              expect(error).to.be.null;
              expect(data).to.be.an('object').like({ name: TEST_VIEW_NAME });

              jenkins.delete_view(TEST_VIEW_NAME, function (error, data) {
                log('delete_view', TEST_VIEW_NAME, { error, data });
                expect(error).to.be.null;
                expect(data).to.be.an('object').like({ name: TEST_VIEW_NAME });

                jenkins.all_views(function (error, data) {
                  log('all_views', { error, data });
                  expect(error).to.be.null;
                  expect(data).to.be.an('array').that.does.not.contain.something.like({ name: TEST_VIEW_NAME });

                  done();

                }); // all_views
              }); // delete_view
            }); // update_view
          }); // all_views
        }); // view_info
      }); // create_view
    }); // delete_view
  });

  it('Should add/remove and list jobs in view', function (done) {
    expect(jenkins.add_job_to_view).to.be.a('function');
    expect(jenkins.remove_job_from_view).to.be.a('function');
    expect(jenkins.all_jobs_in_view).to.be.a('function');

    jenkins.delete_view(TEST_VIEW_NAME, function (error, data) {
      // NOTE ignoring error

      jenkins.create_view(TEST_VIEW_NAME, function (error, data) {
        log('create_view', { error, data });
        expect(error).to.be.null;
        expect(data).to.be.an('object').like({ name: TEST_VIEW_NAME });

        jenkins.add_job_to_view(TEST_VIEW_NAME, JOB_NAME_TEST, function (error, data) {
          log('add_job_to_view', { error, data });
          expect(error).to.be.null;

          jenkins.all_jobs_in_view(TEST_VIEW_NAME, function (error, data) {
            log('all_jobs_in_view', { error, data });
            expect(error).to.be.null;
            expect(data).to.be.an('array').that.contains.something.like({ name: JOB_NAME_TEST });

            jenkins.remove_job_from_view(TEST_VIEW_NAME, JOB_NAME_TEST, function (error, data) {
              log('remove_job_from_view', { error, data });
              expect(error).to.be.null;

              jenkins.all_jobs_in_view(TEST_VIEW_NAME, function (error, data) {
                log('all_jobs_in_view', { error, data });
                expect(error).to.be.null;
                expect(data).to.be.an('array').that.not.contains.something.like({ name: JOB_NAME_TEST });

                jenkins.delete_view(TEST_VIEW_NAME, function (error, data) {
                  log('delete_view', TEST_VIEW_NAME, { error, data });
                  expect(error).to.be.null;
                  expect(data).to.be.an('object').like({ name: TEST_VIEW_NAME });

                  done();

                }); // delete_view
              }); // all_jobs_in_view
            }); // remove_job_from_view
          }); // all_jobs_in_view
        }); // add_job_to_view
      }); // create_view
    }); // delete_view
  });


  it('Should start/stop and list builds', function (done) {
    expect(jenkins.build).to.be.a('function');
    expect(jenkins.job_info).to.be.a('function');
    expect(jenkins.queue_item).to.be.a('function');
    expect(jenkins.all_builds).to.be.a('function');
    expect(jenkins.build_info).to.be.a('function');
    expect(jenkins.stop_build).to.be.a('function');
    expect(jenkins.console_output).to.be.a('function');
    expect(jenkins.last_build_info).to.be.a('function');
    expect(jenkins.delete_build).to.be.a('function');

    jenkins.build(JOB_NAME_TEST, function (error, data) {
      log('build', JOB_NAME_TEST, { error, data });
      expect(error).to.be.null;
      expect(data).to.be.an('object');
      expect(data.queueId).to.be.a('number');

      const queueId = data.queueId;

      jenkins.job_info(JOB_NAME_TEST, function (error, data) {
        log('job_info', JOB_NAME_TEST, { error, data });
        expect(error).to.be.null;
        expect(data).to.be.an('object').like({ name: JOB_NAME_TEST });
        expect(data.queueItem).to.be.an('object').like({ _class: 'hudson.model.Queue$WaitingItem', id: queueId });

        jenkins.queue_item(queueId, function (error, data) {
          log('queue_item', queueId, { error, data });
          expect(error).to.be.null;
          expect(data).to.be.an('object').like({ id: queueId });

          setTimeout(function () {

            jenkins.queue_item(queueId, function (error, data) {
              log('queue_item', queueId, { error, data });
              expect(error).to.be.null;
              expect(data).to.be.an('object').like({ id: queueId });
              expect(data.executable).to.be.an('object');
              expect(data.executable.number).to.be.a('number');

              const buildId = data.executable.number;

              jenkins.job_info(JOB_NAME_TEST, function (error, data) {
                log('job_info', JOB_NAME_TEST, { error, data });
                expect(error).to.be.null;
                expect(data).to.be.an('object').like({ name: JOB_NAME_TEST });
                expect(data.lastBuild).to.be.an('object').like({ _class: 'hudson.model.FreeStyleBuild' });
                expect(data.lastBuild.number).to.equal(buildId);

                jenkins.all_builds(JOB_NAME_TEST, function (error, data) {
                  log('all_builds', JOB_NAME_TEST, { error, data });
                  expect(error).to.be.null;
                  expect(data).to.be.an('array').that.contains.something.like({ id: `${buildId}` });

                  jenkins.build_info(JOB_NAME_TEST, buildId, function (error, data) {
                    log('build_info', JOB_NAME_TEST, buildId, { error, data });
                    expect(error).to.be.null;
                    expect(data).to.be.an('object').like({ number: buildId, building: true, result: null });

                    jenkins.stop_build(JOB_NAME_TEST, buildId, function (error, data) {
                      log('stop_build', JOB_NAME_TEST, buildId, { error, data });
                      expect(error).to.be.null;
                      expect(data).to.be.an('object').like({ body: `Build ${buildId} stopped.` });

                      setTimeout(function () {

                        jenkins.build_info(JOB_NAME_TEST, buildId, function (error, data) {
                          log('build_info', JOB_NAME_TEST, buildId, { error, data });
                          expect(error).to.be.null;
                          expect(data).to.be.an('object').like({ number: buildId, building: false, result: 'ABORTED' });

                          jenkins.console_output(JOB_NAME_TEST, buildId, function (error, data) {
                            log('console_output', JOB_NAME_TEST, buildId, { error, data });
                            expect(error).to.be.null;
                            expect(data).to.be.an('object');
                            expect(data.body).to.be.a('string').that.contains('sleep 60');

                            jenkins.last_build_info(JOB_NAME_TEST, function (error, data) {
                              log('last_build_info', JOB_NAME_TEST, { error, data });
                              expect(error).to.be.null;
                              expect(data).to.be.an('object').like({ number: buildId, building: false, result: 'ABORTED' });

                              jenkins.delete_build(JOB_NAME_TEST, buildId, function (error, data) {
                                log('delete_build', JOB_NAME_TEST, buildId, { error, data });
                                expect(error).to.be.null;

                                jenkins.all_builds(JOB_NAME_TEST, function (error, data) {
                                  log('all_builds', JOB_NAME_TEST, { error, data });
                                  expect(error).to.be.null;
                                  expect(data).to.be.an('array').that.does.not.contain.something.like({ id: `${buildId}` });

                                  done();

                                }); // all_builds
                              }); // delete_build
                            }); // last_build_info
                          }); // console_output
                        }); // build_info

                      }, 2000); // setTimeout

                    }); // stop_build
                  }); // build_info
                }); // all_builds
              }); // job_info
            }); // queue_item

          }, 11000); // setTimeout

        }); // queue_item
      }); // job_info
    }); // build
  }).timeout(14000);

  it('Should build with params', function (done) {
    const SLEEP_TIME = 123;

    fs.readFile(TEST_WITH_PARAMS_CONFIG_XML_FILE, 'utf8', function (error, xmlConfig) {
      log('readFile', { error, xmlConfig });

      jenkins.create_job(JOB_NAME_NEW, xmlConfig, function (error, data) {
        log('create_job', JOB_NAME_NEW, { error, data });

        jenkins.build_with_params(JOB_NAME_NEW, { sleep_time: SLEEP_TIME }, function (error, data) {
          log('build_with_params', JOB_NAME_NEW, { error, data });
          expect(error).to.be.null;
          expect(data).to.be.an('object');
          expect(data.queueId).to.be.a('number');

          const queueId = data.queueId;

          setTimeout(function () {

            jenkins.queue_item(queueId, function (error, data) {
              log('queue_item', queueId, { error, data });
              expect(error).to.be.null;
              expect(data).to.be.an('object').like({ id: queueId });
              expect(data.executable).to.be.an('object');
              expect(data.executable.number).to.be.a('number');

              const buildId = data.executable.number;

              jenkins.console_output(JOB_NAME_NEW, buildId, function (error, data) {
                log('console_output', JOB_NAME_NEW, buildId, { error, data });
                expect(error).to.be.null;
                expect(data).to.be.an('object');
                expect(data.body).to.be.a('string').that.contains(`sleep ${SLEEP_TIME}`);

                jenkins.delete_job(JOB_NAME_NEW, function (error, data) {
                  log('delete_job', JOB_NAME_NEW, { error, data });
                  expect(error).to.be.null;
                  expect(data).to.be.an('object').like({ name: JOB_NAME_NEW });

                  done();

                }); // delete_job
              }); // console_output
            }); // queue_item

          }, 11000); // setTimeout

        }); // build_with_params
      }); // create_job
    }); // readFile
  }).timeout(14000);

  // Use for onetime tasks do this
  it('should show a test report', function (done) {
    fs.readFile(TEST_WITH_REPORT_CONFIG_XML_FILE, 'utf8', function (error, xmlConfig) {
      log('readFile', { error, xmlConfig });

      jenkins.create_job(JOB_NAME_REPORT, xmlConfig, function (error, data) {
        log('create_job', JOB_NAME_REPORT, { error, data });

        jenkins.build(JOB_NAME_REPORT, function (error, data) {
          log('build', JOB_NAME_REPORT, { error, data });
          expect(error).to.be.null;
          expect(data).to.be.an('object');
          expect(data.queueId).to.be.a('number');

          const queueId = data.queueId;

          setTimeout(function () {

            jenkins.last_build_info(JOB_NAME_REPORT, function (error, data) {
              log('last_build_info', JOB_NAME_REPORT, { error, data });
              expect(error).to.be.null;
              expect(data).to.be.an('object').like({ queueId: queueId, result: 'SUCCESS' });
              expect(data.number).to.be.a('number');

              const buildId = data.number;

              jenkins.test_result(JOB_NAME_REPORT, buildId, function (error, data) {
                log('test_result', JOB_NAME_REPORT, buildId, { error, data });
                expect(error).to.be.null;
                expect(data).to.be.an('object').like({ duration: 0.006, empty: false, failCount: 0, passCount: 1, skipCount: 0 });

                jenkins.delete_job(JOB_NAME_REPORT, function (error, data) {
                  log('delete_job', JOB_NAME_REPORT, { error, data });
                  done();

                }); // delete_job
              }); // test_result
            }); // queue_item
          }, 11000); // setTimeout
        }); // build_with_params
      }); // create_job
    }); // readFile
  }).timeout(12000);

  // For onetime tasks do this
  // it.only('should do this', function(done) {
  //  jenkins.last_build_report(JOB_NAME_REPORT, function (error, data) {
  //    log(error, data);
  //    done();
  //  }); // queue_item
  // });

});
