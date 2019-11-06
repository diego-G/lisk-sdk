/*
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
import { gte as isVersionGTE, valid as isValidVersion } from 'semver';
import { isIP, isNumeric, isPort } from 'validator';
import { getByteSize } from '.';
import {
	INCOMPATIBLE_NETWORK_REASON,
	INCOMPATIBLE_PROTOCOL_VERSION_REASON,
	INVALID_PEER_INFO_LIST_REASON,
	PEER_INFO_LIST_TOO_LONG_REASON,
} from '../constants';
import {
	InvalidNodeInfoError,
	InvalidPeerInfoError,
	InvalidPeerInfoListError,
	InvalidProtocolMessageError,
	InvalidRPCRequestError,
} from '../errors';
import {
	P2PCompatibilityCheckReturnType,
	P2PMessagePacket,
	P2PNodeInfo,
	P2PPeerInfo,
	P2PRequestPacket,
	ProtocolPeerInfo,
} from '../p2p_types';
import { constructPeerId } from './misc';

interface RPCPeerListResponse {
	readonly peers: ReadonlyArray<object>;
	readonly success?: boolean; // Could be used in future
}

const IPV4_NUMBER = 4;
const IPV6_NUMBER = 6;

const validateNetworkCompatibility = (
	peerInfo: P2PPeerInfo,
	nodeInfo: P2PNodeInfo,
): boolean => {
	if (!peerInfo.sharedState) {
		return false;
	}

	if (!peerInfo.sharedState.nethash) {
		return false;
	}

	return peerInfo.sharedState.nethash === nodeInfo.nethash;
};

const validateProtocolVersionCompatibility = (
	peerInfo: P2PPeerInfo,
	nodeInfo: P2PNodeInfo,
): boolean => {
	if (!peerInfo.sharedState) {
		return false;
	}
	// Backwards compatibility for older peers which do not have a protocolVersion field.
	if (!peerInfo.sharedState.protocolVersion) {
		try {
			return isVersionGTE(
				peerInfo.sharedState.version,
				nodeInfo.minVersion as string,
			);
		} catch (error) {
			return false;
		}
	}
	if (typeof peerInfo.sharedState.protocolVersion !== 'string') {
		return false;
	}

	const peerHardForks = parseInt(
		peerInfo.sharedState.protocolVersion.split('.')[0],
		10,
	);
	const systemHardForks = parseInt(nodeInfo.protocolVersion.split('.')[0], 10);

	return systemHardForks === peerHardForks && peerHardForks >= 1;
};

export const validatePeerCompatibility = (
	peerInfo: P2PPeerInfo,
	nodeInfo: P2PNodeInfo,
): P2PCompatibilityCheckReturnType => {
	if (!validateNetworkCompatibility(peerInfo, nodeInfo)) {
		return {
			success: false,
			errors: [INCOMPATIBLE_NETWORK_REASON],
		};
	}

	if (!validateProtocolVersionCompatibility(peerInfo, nodeInfo)) {
		return {
			success: false,
			errors: [INCOMPATIBLE_PROTOCOL_VERSION_REASON],
		};
	}

	return {
		success: true,
	};
};

export const validatePeerAddress = (ip: string, wsPort: number): boolean => {
	if (
		(!isIP(ip, IPV4_NUMBER) && !isIP(ip, IPV6_NUMBER)) ||
		!isPort(wsPort.toString())
	) {
		return false;
	}

	return true;
};

export const validatePeerInfo = (
	rawPeerInfo: unknown,
	maxByteSize: number,
): P2PPeerInfo => {
	if (!rawPeerInfo) {
		throw new InvalidPeerInfoError(`Invalid peer object`);
	}

	const byteSize = getByteSize(rawPeerInfo);
	if (byteSize > maxByteSize) {
		throw new InvalidPeerInfoError(
			`PeerInfo was larger than the maximum allowed ${maxByteSize} bytes`,
		);
	}

	const protocolPeer = rawPeerInfo as ProtocolPeerInfo;
	const ipAddress = protocolPeer.ip || protocolPeer.ipAddress;

	if (
		!ipAddress ||
		!protocolPeer.wsPort ||
		!validatePeerAddress(ipAddress, protocolPeer.wsPort)
	) {
		throw new InvalidPeerInfoError(
			`Invalid peer ip or port for peer with ip: ${ipAddress} and wsPort ${
				protocolPeer.wsPort
			}`,
		);
	}

	if (!protocolPeer.version || !isValidVersion(protocolPeer.version)) {
		throw new InvalidPeerInfoError(
			`Invalid peer version for peer with ip: ${protocolPeer.ip}, wsPort ${
				protocolPeer.wsPort
			} and version ${protocolPeer.version}`,
		);
	}

	const {
		ip,
		ipAddress: protocolIPAddress,
		version,
		protocolVersion,
		height,
		os,
		wsPort,
		options,
		...restOfProtocolPeer
	} = protocolPeer;

	const peerInfo: P2PPeerInfo = {
		peerId: constructPeerId(ipAddress, protocolPeer.wsPort),
		ipAddress,
		wsPort: +wsPort,
		sharedState: {
			version,
			protocolVersion: protocolVersion as string,
			os: os ? os : '',
			height: height && isNumeric(height.toString()) ? +height : 0,
			...restOfProtocolPeer,
		},
	};

	return peerInfo;
};

export const validateNodeInfo = (
	nodeInfo: P2PNodeInfo,
	maxByteSize: number,
): P2PNodeInfo => {
	const byteSize = getByteSize(nodeInfo);

	if (byteSize > maxByteSize) {
		throw new InvalidNodeInfoError(
			`Invalid NodeInfo was larger than the maximum allowed ${maxByteSize} bytes`,
		);
	}

	if (!nodeInfo.version || !isValidVersion(nodeInfo.version)) {
		throw new InvalidNodeInfoError(
			`Invalid NodeInfo version ${nodeInfo.version}`,
		);
	}

	return nodeInfo;
};

export const validatePeersInfoList = (
	rawBasicPeerInfoList: unknown,
	maxPeerInfoListLength: number,
	maxPeerInfoByteSize: number,
): ReadonlyArray<P2PPeerInfo> => {
	if (!rawBasicPeerInfoList) {
		throw new InvalidPeerInfoListError(INVALID_PEER_INFO_LIST_REASON);
	}
	const { peers } = rawBasicPeerInfoList as RPCPeerListResponse;

	if (Array.isArray(peers)) {
		if (peers.length === 0) {
			return [];
		}
		if (peers.length > maxPeerInfoListLength) {
			throw new InvalidPeerInfoListError(PEER_INFO_LIST_TOO_LONG_REASON);
		}

		const sanitizedPeerList = peers.map<P2PPeerInfo>(peerInfo =>
			validatePeerInfo(peerInfo, maxPeerInfoByteSize),
		);

		return sanitizedPeerList;
	} else {
		throw new InvalidPeerInfoListError(INVALID_PEER_INFO_LIST_REASON);
	}
};

export const validateRPCRequest = (request: unknown): P2PRequestPacket => {
	if (!request) {
		throw new InvalidRPCRequestError('Invalid request');
	}

	const rpcRequest = request as P2PRequestPacket;
	if (typeof rpcRequest.procedure !== 'string') {
		throw new InvalidRPCRequestError('Request procedure name is not a string');
	}

	return rpcRequest;
};

export const validateProtocolMessage = (message: unknown): P2PMessagePacket => {
	if (!message) {
		throw new InvalidProtocolMessageError('Invalid message');
	}

	const protocolMessage = message as P2PMessagePacket;
	if (typeof protocolMessage.event !== 'string') {
		throw new InvalidProtocolMessageError('Protocol message is not a string');
	}

	return protocolMessage;
};
