const path = require('path');
const tar = require('tar-fs');

// images
const platformControllerImage = 'git.project-hobbit.eu:4567/gitadmin/platform-controller-image';
const guiImage = 'git.project-hobbit.eu:4567/gitadmin/platform-gui-image';
const keycloakImage = 'git.project-hobbit.eu:4567/gitadmin/hobbit-keycloak:1.0.0';
const analysisImage = 'git.project-hobbit.eu:4567/gitadmin/platform-analysis-image';
const rabbitImage = 'rabbitmq:management';
const redisImage = 'redis:4.0.7';
const vosImage = 'openlink/virtuoso_opensource:v07.20.3217';
const storageServiceImage = 'git.project-hobbit.eu:4567/gitadmin/platform-storage-image';

// volumes
const keycloakVolumeName = 'hobbit-keycloak-config';
const virtuosoVolumeName = 'hobbit-virtuoso-config';

// networks
const hobbitNetwork = 'hobbit';
const hobbitCoreNetwork = 'hobbit-core';
const hobbitServiceNetwork = 'hobbit-services';

const sleep = t => new Promise(r => setTimeout(r, t));

exports.getQuestions = () => [
  {
    type: 'input',
    name: 'projectName',
    message: 'HOBBIT project name:',
  },
  {
    type: 'confirm',
    name: 'isTesting',
    message: 'Running in testing mode?',
  },
  {
    type: 'input',
    name: 'gitlabUser',
    message: 'You will need to provide your info from HOBBIT Gitlab (http://git.project-hobbit.eu/)\nGitlab username:',
  },
  {
    type: 'input',
    name: 'gitlabEmail',
    message: 'Gitlab email:',
  },
  {
    type: 'input',
    name: 'gitlabToken',
    message: 'Gitlab token:',
  },
  {
    type: 'input',
    name: 'guiHost',
    message: 'Domain for GUI:',
  },
  {
    type: 'input',
    name: 'keycloakHost',
    message: 'Domain for Keycloak:',
  },
  {
    type: 'input',
    name: 'virtuosoHost',
    message: 'Domain for Virtuoso:',
  },
  {
    type: 'input',
    name: 'rabbitmqHost',
    message: 'Domain for RabbitMQ:',
  },
];

const prepareKeycloakConfig = async ({util, docker, answers, username, serverConfig, volume}) => {
  // build image that copies our keycloak config to that volume
  const logLine = data => util.logger.debug('BUILD-LOG:', data);
  const tag = 'hobbit-keycloak-volume-filler';
  const tarStream = tar.pack(path.join(__dirname, 'keycloak'));
  const {log: buildLog, image: keycloakFillImage} = await docker.buildFromParams({tarStream, tag, logLine});
  util.logger.debug('Built volume fill image:', keycloakFillImage, buildLog);

  // generate deployment name
  const deploymentName = util.nameFromImage(keycloakFillImage);

  // start that image with volume to copy data
  let fillerInspect = await docker.startFromParams({
    image: keycloakFillImage,
    projectName: answers.projectName,
    username,
    deploymentName,
    hostname: deploymentName,
    restartPolicy: 'no',
    Mounts: [
      {
        Type: 'volume',
        Source: volume.name,
        Target: '/cfg-volume',
      },
    ],
  });
  util.logger.debug('started filler:', fillerInspect);

  let isExited = false;

  if (serverConfig.swarm) {
    do {
      await sleep(3000);
      const tasks = await docker.daemon.listTasks({filters: `{"service": ["${fillerInspect.Spec.Name}"]}`});
      const task = tasks.pop();
      util.logger.debug('got task:', task);
      isExited = task.Status.State === 'complete';
      if (isExited && task.Status.Message !== 'finished') {
        throw new Error(`Error creating config volume for keycloak: ${fillerInspect.Status.Message}`);
      }
    } while (!isExited);

    return;
  }

  do {
    // wait for 3s to give it time to copy config
    await sleep(3000);
    fillerInspect = await docker.daemon.getContainer(fillerInspect.Id).inspect();
    isExited = fillerInspect.State.Status === 'exited';
    if (isExited && fillerInspect.State.ExitCode !== 0) {
      throw new Error(
        `Error creating config volume for keycloak: ${fillerInspect.State.Error} (code: ${
          fillerInspect.State.ExitCode
        })`
      );
    }
  } while (!isExited);

  util.logger.debug('after sleep:', fillerInspect);
};

const prepareVirtuosoConfig = async ({util, docker, answers, username, serverConfig, volume}) => {
  // build image that copies our virtuoso config to that volume
  const logLine = data => util.logger.debug('BUILD-LOG:', data);
  const tag = 'hobbit-virtuoso-volume-filler';
  const tarStream = tar.pack(path.join(__dirname, 'virtuoso'));
  const {log: buildLog, image: virtuosoFillImage} = await docker.buildFromParams({tarStream, tag, logLine});
  util.logger.debug('Built volume fill image:', virtuosoFillImage, buildLog);

  // generate deployment name
  const deploymentName = util.nameFromImage(virtuosoFillImage);

  // start that image with volume to copy data
  let fillerInspect = await docker.startFromParams({
    image: virtuosoFillImage,
    projectName: answers.projectName,
    username,
    deploymentName,
    hostname: deploymentName,
    restartPolicy: 'no',
    Mounts: [
      {
        Type: 'volume',
        Source: volume.name,
        Target: '/cfg-volume',
      },
    ],
  });
  util.logger.debug('started filler:', fillerInspect);

  let isExited = false;

  if (serverConfig.swarm) {
    do {
      await sleep(3000);
      const tasks = await docker.daemon.listTasks({filters: `{"service": ["${fillerInspect.Spec.Name}"]}`});
      const task = tasks.pop();
      util.logger.debug('got task:', task);
      isExited = task.Status.State === 'complete';
      if (isExited && task.Status.Message !== 'finished') {
        throw new Error(`Error creating config volume for keycloak: ${fillerInspect.Status.Message}`);
      }
    } while (!isExited);

    return;
  }

  do {
    // wait for 3s to give it time to copy config
    await sleep(3000);
    fillerInspect = await docker.daemon.getContainer(fillerInspect.Id).inspect();
    isExited = fillerInspect.State.Status === 'exited';
    if (isExited && fillerInspect.State.ExitCode !== 0) {
      throw new Error(
        `Error creating config volume for keycloak: ${fillerInspect.State.Error} (code: ${
          fillerInspect.State.ExitCode
        })`
      );
    }
  } while (!isExited);

  util.logger.debug('after sleep:', fillerInspect);
};

exports.runSetup = async ({answers, serverConfig, username, docker, util}) => {
  // init log
  const log = [];

  try {
    util.logger.debug('starting HOBBIT platform..');

    // create networks
    util.logger.debug('creating networks..');
    await docker.createNetwork(hobbitNetwork);
    await docker.createNetwork(hobbitCoreNetwork);
    await docker.createNetwork(hobbitServiceNetwork);

    // create new volume for keycloak config
    const keycloakVolume = await docker.daemon.createVolume({Name: keycloakVolumeName});
    util.logger.debug(keycloakVolume);
    // fill volume with config
    await prepareKeycloakConfig({util, docker, serverConfig, answers, username, volume: keycloakVolume});
    util.logger.debug('HOBBIT Keycloak config volume created');

    // create new volume for virtuoso config
    const virtuosoVolume = await docker.daemon.createVolume({Name: virtuosoVolumeName});
    util.logger.debug(virtuosoVolume);
    // fill volume with config
    await prepareVirtuosoConfig({util, docker, serverConfig, answers, username, volume: virtuosoVolume});
    util.logger.debug('HOBBIT Virtuoso config volume created');
  } catch (e) {
    util.logger.error('error:', e);
    log.push({message: e.toString(), data: e, level: 'error'});
  }

  return log;
};
