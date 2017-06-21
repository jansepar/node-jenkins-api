var chai = require('chai'),
    expect = chai.expect;

var chaiLike = require('chai-like');
var chaiThings = require('chai-things');
chai.use(chaiLike);
chai.use(chaiThings);

var jenkinsapi = require('../lib/main');
var JENKINS_URL="http://localhost:8080";

var JOB_NAME_TEST = "asrwqersfdzdraser-test";
var JOB_NAME_NEW = "asrwqersfdzdraser-test-new";
var JOB_NAME_COPY = "asrwqersfdzdraser-test-copy";

var DEVELOPMENT_PROJECT_XML_CONFIG = '<?xml version="1.0" encoding="UTF-8"?><project><description>development</description></project>';
var ORIGINAL_CONFIG = 'development';
var REPLACED_CONFIG = 'feature';

describe('Node Jenkins API', function() {

  it('Should exist', function() {
    expect(jenkinsapi).not.to.be.undefined;
    expect(jenkinsapi.init).to.be.a('function');
  });

  // TODO handle this better as a test setup
  var jenkins = jenkinsapi.init(JENKINS_URL);


  it('Should create the connection object', function() {
    expect(jenkins).not.to.be.undefined;
  });

  // TODO handle this better as a test setup
  jenkins.delete_job(JOB_NAME_NEW);
  jenkins.delete_job(JOB_NAME_COPY);

  it('Should show all jobs', function(done) {
    expect(jenkins.all_jobs).to.be.a('function');

    jenkins.all_jobs(function(error, data) {
      expect(error).to.be.null;
      expect(data).to.be.an('array').that.contains.something.like({name: JOB_NAME_TEST});
      done();
    }); // all_jobs
  });

  it('Should read xml of existing job', function(done) {
    expect(jenkins.get_config_xml).to.be.a('function');

    jenkins.get_config_xml(JOB_NAME_TEST, function(error, data) {
      expect(error).to.be.null;
      expect(data).to.be.a('string').that.contains(ORIGINAL_CONFIG);
      done();
    }); // get_config_xml
  });

  it('Should create and delete job', function(done) {
    expect(jenkins.create_job).to.be.a('function');
    expect(jenkins.delete_job).to.be.a('function');

    jenkins.create_job(JOB_NAME_NEW, DEVELOPMENT_PROJECT_XML_CONFIG, function(error, data) {
      expect(error).to.be.null;

      jenkins.all_jobs(function(error, data) {
        expect(error).to.be.null;
        expect(data).to.be.an('array').that.contains.something.like({name: JOB_NAME_NEW});

        jenkins.delete_job(JOB_NAME_NEW, function(error, data) {
          expect(error).to.be.null;

          jenkins.all_jobs(function(error, data) {
            expect(error).to.be.null;
            expect(data).to.be.an('array').that.not.contains.something.like({name: JOB_NAME_NEW});

            done();

          }); // all_jobs
        }); // delete_job
      }); // all_jobs
    }); // create_job
  });

  it('Should copy job', function(done) {
    expect(jenkins.copy_job).to.be.a('function');

    jenkins.copy_job(JOB_NAME_TEST, JOB_NAME_COPY, function(data) {
      return data.replace(ORIGINAL_CONFIG, REPLACED_CONFIG);
    }, function(error, data) {
      expect(error).to.be.null;

      jenkins.get_config_xml(JOB_NAME_COPY, function(error, data) {
        expect(error).to.be.null;
        expect(data).to.be.a('string').that.contains(REPLACED_CONFIG);

        jenkins.delete_job(JOB_NAME_COPY, function(error, data) {
          expect(error).to.be.null;
          done();
        }); // delete_job
      }); // get_config_xml
    }); // copy_job
  });

  it('Should update job config', function(done) {
    expect(jenkins.update_config).to.be.a('function');

    jenkins.copy_job(JOB_NAME_TEST, JOB_NAME_COPY, function(data) {
      return data;
    }, function(error, data) {
      expect(error).to.be.null;

      jenkins.update_config(JOB_NAME_COPY, function(data) {
        return data.replace(ORIGINAL_CONFIG, REPLACED_CONFIG);
      }, function(error, data) {
        expect(error).to.be.null;

        jenkins.get_config_xml(JOB_NAME_COPY, function(error, data) {
          expect(error).to.be.null;
          expect(data).to.be.a('string').that.contains(REPLACED_CONFIG);

          jenkins.delete_job(JOB_NAME_COPY, function(error, data) {
            expect(error).to.be.null;
            done();
          }); // delete_job
        }); // get_config_xml
      }); // update_config
    }); // copy_job
  });

});
