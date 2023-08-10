interface Server {
    id: number,
    ip: string
}

interface Service {
    id: number,
    name: string
}

interface Job {
    id: number
}

interface ServiceData {
    id: number,
    name: string,
}

interface PfSense {
    id: number,
    ip: string
}

interface PfSenseService {
    id: number,
    name: string,
    pfSenseRequestId: number | null
}

export class PingTemplate {
    messageType: number;
    serverType: number;
    server: Server;
    status: string;
    pingInfo: string[];

    constructor(serverId: number, ip: string, status: string, pingInfo: string[], serverType: number | null) {
        this.messageType = 1;
        this.serverType = serverType ?? 0;
        this.server = { id: serverId, ip };
        this.status = status;
        this.pingInfo = pingInfo;
    }
}

export class ServiceTestTemplate {
    messageType: number;
    service: Service;
    server: Server;
    job: Job;
    status: string[];

    constructor(serviceId: number, serviceName: string, serverId: number, ip: string, jobId: number, status: string[]) {
        this.messageType = 2;
        this.service = { id: serviceId, name: serviceName };
        this.server = { id: serverId, ip };
        this.job = { id: jobId };
        this.status = status;
    }
}

export class PfSenseServiceTemplate {
    messageType: number;
    pfSense: PfSense;
    pfSenseService: PfSenseService;
    status: string[];

    constructor(pfSenseId: number, pfSenseIp: string, pfSenseServiceId: number, pfSenseServiceName: string, pfSenseRequestId: number | null, status: string[]) {
        this.messageType = 3;
        this.pfSense = { id: pfSenseId, ip: pfSenseIp };
        this.pfSenseService = { id: pfSenseServiceId, name: pfSenseServiceName, pfSenseRequestId };
        this.status = status;
    }
}

export class ServiceDataTemplate {
    messageType: number;
    service: Service;
    serviceData: ServiceData;
    value: number | string;
    status: string[];

    constructor(serviceId: number, serviceName: string, serviceDataId: number, serviceDataName: string, value: number | string, status: string[]) {
        this.messageType = 4;
        this.service = { id: serviceId, name: serviceName };
        this.serviceData = { id: serviceDataId, name: serviceDataName };
        this.value = value;
        this.status = status;
    }
}