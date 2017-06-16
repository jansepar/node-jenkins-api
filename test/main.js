var chai = require('chai'),
    expect = chai.expect,
    should = chai.should();

var Promise = require('bluebird');

var jenkinsapi = require('../lib/main');
var JENKINS_URL="http://localhost:8080";

describe('Node Jenkins API', function() {

  it('Should exist', function() {
    expect(jenkinsapi).not.to.be.undefined;
    expect(jenkinsapi.init).to.be.a('function');
  });

  var jenkins;

  it('Should connect', function() {
    jenkins = jenkinsapi.init(JENKINS_URL);
    expect(jenkins).not.to.be.undefined;
  });

  it('Should show all jobs', function(done) {
    expect(jenkins.all_jobs).to.be.a('function');
    jenkins.all_jobs(function(error, data) {
      console.log('all_jobs', {error, data});
      expect(error).to.be.null;
      expect(data).to.be.an('array');//.that.deep.contains({name: 'test-development'});
      done();
    });
  });

  it('Should read xml of existing job', function(done) {
    expect(jenkins.get_config_xml).to.be.a('function');

    jenkins.get_config_xml('test-development', function(error, data) {
      console.log('get_config_xml', {error, data});
      expect(error).to.be.null;
      done();
    });
  });

  it('Should create and delete job', function(done) {
    expect(jenkins.create_job).to.be.a('function');
    expect(jenkins.delete_job).to.be.a('function');

    var emptyXml = '<?xml version="1.0" encoding="UTF-8"?><project></project>';

    jenkins.create_job('test-new', emptyXml, function(error, data) {
      console.log('create_job', {error, data});
      expect(error).to.be.null;

      jenkins.delete_job('test-new', function(error, data) {
        console.log('delete_job', {error, data});
        expect(error).to.be.null;
        done();
      });
    });
  });

  it('Should copy job', function(done) {
    expect(jenkins.copy_job).to.be.a('function');

    jenkins.copy_job('test-development', 'test-copy', function(data) {
      return data.replace('development','feature-branch');
    }, function(error, data) {
      console.log('copy_job', {error, data});
      expect(error).to.be.null;

      jenkins.delete_job('test-copy', function(error, data) {
        console.log('delete_job', {error, data});
        expect(error).to.be.null;
        done();
      });
    });
  });

});
