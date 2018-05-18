const path = require('path');
const tar = require('tar-fs');

// images
const platformControllerImage = 'hobbitproject/hobbit-platform-controller';
const guiImage = 'hobbitproject/hobbit-gui';
const keycloakImage = 'git.project-hobbit.eu:4567/gitadmin/hobbit-keycloak:1.0.0';
const analysisImage = 'hobbitproject/hobbit-analysis-component';
const rabbitImage = 'rabbitmq:management';
const redisImage = 'redis:4.0.7';
const vosImage = 'openlink/virtuoso_opensource:v07.20.3217';
const storageServiceImage = 'hobbitproject/hobbit-storage-service';

// volumes
const keycloakVolumeName = 'hobbit-keycloak-config';
const virtuosoVolumeName = 'hobbit-virtuoso-config';
const redisVolumeName = 'hobbit-redis-config';

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
    default: 'hobbit',
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

const prepareRedisConfig = async ({util, docker, answers, username, serverConfig, volume}) => {
  // build image that copies our keycloak config to that volume
  const logLine = data => util.logger.debug('BUILD-LOG:', data);
  const tag = 'hobbit-redis-volume-filler';
  const tarStream = tar.pack(path.join(__dirname, 'redis'));
  const {log: buildLog, image: redisFillImage} = await docker.buildFromParams({tarStream, tag, logLine});
  util.logger.debug('Built volume fill image:', redisFillImage, buildLog);

  // generate deployment name
  const deploymentName = util.nameFromImage(redisFillImage);

  // start that image with volume to copy data
  let fillerInspect = await docker.startFromParams({
    image: redisFillImage,
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

const executeAfterServiceStarted = async ({service, command, serverConfig, util, docker}) => {
  // wait for service status
  let isRunning = false;

  if (serverConfig.swarm) {
    let task;

    do {
      await sleep(3000);
      const tasks = await docker.daemon.listTasks({filters: `{"service": ["${service.Spec.Name}"]}`});
      task = tasks.pop();
      util.logger.debug('got task:', task);
      isRunning = task.Status.State === 'running';
    } while (!isRunning);

    // get container
    const containerId = task.Status.ContainerStatus.ContainerID;
    const container = docker.daemon.getContainer(containerId);

    // execute command
    const exec = await container.exec({Cmd: command});
    const execResult = new Promise(async resolve => {
      const {output} = await exec.start();
      const res = [];
      output.on('data', d => res.push(d)).on('end', () => {
        const out = Buffer.concat(res);
        resolve(out.toString('utf8', 8));
      });
    });
    return execResult;
  }

  const container = docker.daemon.getContainer(service.Id);
  do {
    // wait for 3s to give it time to copy config
    await sleep(3000);
    const serviceInfo = await container.inspect();
    isRunning = serviceInfo.State.Status === 'running';
  } while (!isRunning);

  // execute command
  const exec = await container.exec({Cmd: command});
  const execResult = new Promise(async resolve => {
    const {output} = await exec.start();
    const res = [];
    output.on('data', d => res.push(d)).on('end', () => {
      const out = Buffer.concat(res);
      resolve(out.toString('utf8', 8));
    });
  });
  return execResult;
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

    // start keycloak
    const keycloakHost = `hobbit-keycloak-${answers.projectName}`;
    const keycloakService = await docker.startFromParams({
      image: keycloakImage,
      projectName: answers.projectName,
      username,
      frontend: `Host:${answers.keycloakHost}`,
      restartPolicy: 'on-failure:2',
      hostname: keycloakHost,
      additionalLabels: {
        'traefik.port': '8080',
      },
      Mounts: [
        {
          Type: 'volume',
          Source: keycloakVolume.name,
          Target: '/opt/jboss/keycloak/standalone/data/db',
        },
      ],
      additionalNetworks: [hobbitNetwork],
    });
    util.logger.debug('Keycloak started:', keycloakService);

    // create new volume for virtuoso config
    const virtuosoVolume = await docker.daemon.createVolume({Name: virtuosoVolumeName});
    util.logger.debug(virtuosoVolume);
    // fill volume with config
    await prepareVirtuosoConfig({util, docker, serverConfig, answers, username, volume: virtuosoVolume});
    util.logger.debug('HOBBIT Virtuoso config volume created');

    // start virtuoso
    const virtuosoService = await docker.startFromParams({
      image: vosImage,
      projectName: answers.projectName,
      username,
      frontend: `Host:${answers.virtuosoHost}`,
      restartPolicy: 'on-failure:2',
      additionalLabels: {
        'traefik.port': '8890',
      },
      Mounts: [
        {
          Type: 'volume',
          Source: virtuosoVolume.name,
          Target: '/opt/virtuoso-opensource/database',
        },
      ],
      additionalNetworks: [hobbitCoreNetwork],
    });
    util.logger.debug('Virtuoso started:', virtuosoService);

    // execute virtuoso bootstrapping script
    const initResult = await executeAfterServiceStarted({
      service: virtuosoService,
      command: ['sh', 'storage-init.sh'],
      docker,
      serverConfig,
      util,
    });
    util.logger.debug('Virtuoso init executed:', initResult);

    // create new volume for redis config
    const redisVolume = await docker.daemon.createVolume({Name: redisVolumeName});
    util.logger.debug(redisVolume);
    // fill volume with config
    await prepareRedisConfig({util, docker, serverConfig, answers, username, volume: redisVolume});
    util.logger.debug('HOBBIT Redis config volume created');

    // start redis
    const redisHostname = `hobbit-redis-${answers.projectName}`;
    const redisService = await docker.startFromParams({
      image: redisImage,
      projectName: answers.projectName,
      username,
      restartPolicy: 'on-failure:2',
      hostname: redisHostname,
      Mounts: [
        {
          Type: 'volume',
          Source: redisVolume.name,
          Target: '/data',
        },
      ],
      additionalNetworks: [hobbitCoreNetwork],
    });
    util.logger.debug('Redis started:', redisService);

    // start rabbit
    const rabbitHostname = `hobbit-rabbit-${answers.projectName}`;
    const rabbitService = await docker.startFromParams({
      image: rabbitImage,
      projectName: answers.projectName,
      username,
      restartPolicy: 'on-failure:2',
      frontend: `Host:${answers.rabbitmqHost}`,
      hostname: rabbitHostname,
      additionalLabels: {
        'traefik.port': '15672',
      },
      additionalNetworks: [hobbitNetwork, hobbitCoreNetwork],
    });
    util.logger.debug('Rabbit started:', rabbitService);

    // start platform controller
    const platformControllerService = await docker.startFromParams({
      image: platformControllerImage,
      projectName: answers.projectName,
      username,
      restartPolicy: 'on-failure:2',
      Env: [
        `HOBBIT_RABBIT_HOST=${rabbitHostname}`,
        `HOBBIT_REDIS_HOST=${redisHostname}`,
        `DEPLOY_ENV=${answers.isTesting ? 'testing' : 'production'}`,
        `GITLAB_USER=${answers.gitlabUser}`,
        `GITLAB_EMAIL=${answers.gitlabEmail}`,
        `GITLAB_TOKEN=${answers.gitlabToken}`,
      ],
      Mounts: [
        {
          Source: '/var/run/docker.sock',
          Target: '/var/run/docker.sock',
          Type: 'bind',
        },
      ],
      additionalNetworks: [hobbitCoreNetwork],
    });
    util.logger.debug('Platform controller started:', platformControllerService);

    // start gui
    const guiService = await docker.startFromParams({
      image: guiImage,
      projectName: answers.projectName,
      username,
      restartPolicy: 'on-failure:2',
      Env: [
        `KEYCLOAK_AUTH_URL=http://${answers.keycloakHost}/auth`,
        `KEYCLOAK_DIRECT_URL=http://${keycloakHost}:8080/auth`,
        `HOBBIT_RABBIT_HOST=${rabbitHostname}`,
        `CHECK_REALM_URL=false`,
      ],
      frontend: `Host:${answers.guiHost}`,
      additionalLabels: {
        'traefik.port': '8080',
      },
      additionalNetworks: [hobbitNetwork, hobbitCoreNetwork],
    });
    util.logger.debug('GUI started:', guiService);

    // start analysis
    const analysisService = await docker.startFromParams({
      image: analysisImage,
      projectName: answers.projectName,
      username,
      restartPolicy: 'on-failure:2',
      Env: [`HOBBIT_RABBIT_HOST=${rabbitHostname}`],
      additionalNetworks: [hobbitCoreNetwork],
    });
    util.logger.debug('Analysis service started:', analysisService);

    // start storage
    const storageService = await docker.startFromParams({
      image: storageServiceImage,
      projectName: answers.projectName,
      username,
      restartPolicy: 'on-failure:2',
      Env: [
        `HOBBIT_RABBIT_HOST=${rabbitHostname}`,
        `SPARQL_ENDPOINT_URL=http://${answers.virtuosoHost}/sparql`,
        `SPARQL_ENDPOINT_USERNAME=HobbitPlatform`,
        `SPARQL_ENDPOINT_PASSWORD=Password`,
      ],
      additionalNetworks: [hobbitCoreNetwork],
    });
    util.logger.debug('Storage service started:', storageService);
    log.push({message: 'Done setting up HOBBIT platform!\n\n', level: 'info'});
    log.push({
      message: `You still need to navigate to http://${answers.keycloakHost} and configure realms.`,
      level: 'info',
    });
    log.push({
      message: `Once you've opened the page in the browser, click on Administration Console.`,
      level: 'info',
    });
    log.push({
      message: `Login into Keycloak using the username 'admin' and the password 'H16obbit'.`,
      level: 'info',
    });
    log.push({
      message: `Make sure that the realm Hobbit is selected in the left upper corner below the Keycloak logo.`,
      level: 'info',
    });
    log.push({
      message: `Click on Clients in the left menu and click on the Hobbit-GUI client.`,
      level: 'info',
    });
    log.push({
      message: `Add the address of the GUI to the list "Valid Redirect URIs" (with a trailing star, e.g., http://${
        answers.guiHost
      }/*).`,
      level: 'info',
    });
    log.push({
      message: `Add the address of the GUI to the list "Web Origins" (without trailing slash e.g., http://${
        answers.guiHost
      }).`,
      level: 'info',
    });
    log.push({
      message: `Click on "Save" at the bottom of the page.`,
      level: 'info',
    });
    log.push({
      message: `You are ready to go!`,
      level: 'info',
    });
  } catch (e) {
    util.logger.error('error:', e);
    log.push({message: e.toString(), data: e, level: 'error'});
  }

  return log;
};
