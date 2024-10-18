import { Req, UseGuards } from '@nestjs/common';
import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import * as jwt from 'jsonwebtoken'; // Import jsonwebtoken
import { InternalCommunicationsService } from './communications.service';
import { CreateInternalCommunicationDto } from './dtos/create-internal-communication.dto';
import { JwtPayload } from 'src/config/jwt-payload.interface';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class InternalCommunicationsGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;

    constructor(
        private readonly internalCommunicationsService: InternalCommunicationsService,
    ) { }

    afterInit(server: Server) {
        console.log('WebSocket Server Initialized');
    }


    getPayloadFromClient(client: Socket) {
        const handshake = client.handshake;
        const authToken = handshake.headers?.authorization;
        if (authToken) {
            const token = authToken.split(' ')[1];
            try {
                return jwt.verify(token, process.env.JWT_SECRET || "defaultSecretKey") as JwtPayload;
            } catch (error) {
                console.log('Invalid token:', error.message);
            }
        }
    }

    @UseGuards(JwtAuthGuard)
    handleConnection(client: Socket) {
        const payload = this.getPayloadFromClient(client);
        console.log(payload);
        
        if (payload) {
            client.join(payload.department._id);
            console.log(`Client connected: ${client.id}`);
        } else {
            client.disconnect();
            console.log('No Authorization header found');
        }
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('send-message')
    async handleSendCommunication(
        client: Socket,
        createInternal: CreateInternalCommunicationDto,
    ) {
        console.log(createInternal);
        const payload = this.getPayloadFromClient(client);
        if (payload) {
            const communication = await this.internalCommunicationsService.create(createInternal,payload.department,payload.sub);
            this.server.to(payload.department!._id).emit('receiveCommunication', communication);
        } else {
            client.disconnect();
        }
    }

}
