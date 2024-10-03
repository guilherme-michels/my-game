import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import "./App.css";

function App() {
	const mountRef = useRef<HTMLDivElement>(null);
	const [health, setHealth] = useState(3);
	const [score, setScore] = useState(0);
	const [gameOver, setGameOver] = useState(false);
	const [currentWave, setCurrentWave] = useState(1);
	const [waveMessage, setWaveMessage] = useState("");
	const [gameWon, setGameWon] = useState(false);

	useEffect(() => {
		if (!mountRef.current) return;

		// Configuração da cena
		const scene = new THREE.Scene();
		scene.background = new THREE.Color(0x87ceeb); // Cor do céu
		const camera = new THREE.PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000,
		);
		const renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.shadowMap.enabled = true;
		mountRef.current.appendChild(renderer.domElement);

		// Iluminação
		const ambientLight = new THREE.AmbientLight(0x404040);
		scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
		directionalLight.position.set(1, 1, 1);
		directionalLight.castShadow = true;
		scene.add(directionalLight);

		// Controles de câmera
		const controls = new PointerLockControls(camera, renderer.domElement);
		controls.getObject().position.set(0, 1.7, 0); // Posiciona a câmera na altura dos olhos
		scene.add(controls.getObject());

		// Tamanho do mapa
		const mapSize = 50;

		// Chão
		const floorGeometry = new THREE.PlaneGeometry(mapSize, mapSize);
		const floorMaterial = new THREE.MeshStandardMaterial({
			color: 0x808080,
			roughness: 0.8,
			metalness: 0.2,
		});
		const floor = new THREE.Mesh(floorGeometry, floorMaterial);
		floor.rotation.x = -Math.PI / 2;
		floor.receiveShadow = true;
		scene.add(floor);

		// Adicionar linhas de grade ao chão
		const gridHelper = new THREE.GridHelper(mapSize, 10, 0x000000, 0x000000);
		gridHelper.position.y = 0.01;
		scene.add(gridHelper);

		// Paredes
		const wallHeight = 5;
		const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });

		function createWall(
			width: number,
			height: number,
			depth: number,
			x: number,
			y: number,
			z: number,
		) {
			const wallGeometry = new THREE.BoxGeometry(width, height, depth);
			const wall = new THREE.Mesh(wallGeometry, wallMaterial);
			wall.position.set(x, y, z);
			wall.castShadow = true;
			wall.receiveShadow = true;
			scene.add(wall);
		}

		// Criar as quatro paredes
		createWall(mapSize, wallHeight, 1, 0, wallHeight / 2, -mapSize / 2);
		createWall(mapSize, wallHeight, 1, 0, wallHeight / 2, mapSize / 2);
		createWall(1, wallHeight, mapSize, -mapSize / 2, wallHeight / 2, 0);
		createWall(1, wallHeight, mapSize, mapSize / 2, wallHeight / 2, 0);

		// Arma
		const gunGroup = new THREE.Group();

		// Cano da arma
		const barrelGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
		const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
		const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
		barrel.position.set(0, 0, -0.25);
		gunGroup.add(barrel);

		// Empunhadura da arma
		const gripGeometry = new THREE.BoxGeometry(0.15, 0.3, 0.1);
		const gripMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
		const grip = new THREE.Mesh(gripGeometry, gripMaterial);
		grip.position.set(0, -0.15, 0);
		gunGroup.add(grip);

		gunGroup.position.set(0.3, -0.3, -0.5);
		camera.add(gunGroup);

		// Zumbis (cubos)
		const zombies: THREE.Mesh[] = [];
		const zombieGeometry = new THREE.BoxGeometry(1, 2, 1);
		const zombieMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

		const waveConfig = [
			{ zombieCount: 25, speed: 0.05 },
			{ zombieCount: 50, speed: 0.1 },
			{ zombieCount: 75, speed: 0.4 },
			{ zombieCount: 100, speed: 0.5 },
			{ zombieCount: 125, speed: 2.0 },
		];
		const maxZombiesOnScreen = 10;

		function createZombie() {
			if (zombies.length >= maxZombiesOnScreen) return;

			const zombie = new THREE.Mesh(zombieGeometry, zombieMaterial);
			zombie.position.set(
				Math.random() * (mapSize - 4) - (mapSize / 2 - 2),
				1,
				Math.random() * (mapSize - 4) - (mapSize / 2 - 2),
			);
			zombie.castShadow = true;
			(zombie as any).velocity = new THREE.Vector3();
			(zombie as any).speed = waveConfig[currentWave - 1].speed;
			scene.add(zombie);
			zombies.push(zombie);
		}

		function startNewWave(wave: number) {
			if (wave <= 5) {
				setWaveMessage(`Wave ${wave}`);
				setTimeout(() => setWaveMessage(""), 3000);
				zombies.forEach((zombie) => {
					(zombie as any).speed = waveConfig[wave - 1].speed;
				});
				setScore(0); // Reinicia a pontuação para a nova wave
				while (zombies.length < maxZombiesOnScreen) {
					createZombie();
				}
			} else {
				setGameWon(true);
			}
		}

		// Criar zumbis iniciais
		for (let i = 0; i < 10; i++) {
			createZombie();
		}

		// Novo código para carregar e criar corações GLTF
		const hearts: THREE.Group[] = [];
		const loader = new GLTFLoader();

		const maxHearts = 2; // Número máximo de corações no mapa

		function createHeart() {
			if (hearts.length >= maxHearts) return; // Não cria mais corações se já tiver o máximo

			loader.load("/src/heart_in_love/scene.gltf", (gltf) => {
				const heart = gltf.scene;
				heart.scale.set(0.005, 0.005, 0.005); // Reduzimos ainda mais a escala

				// Ajustamos a posição para ficar dentro dos limites do mapa
				const halfMapSize = mapSize / 2 - 1; // Subtraímos 1 para dar uma margem
				heart.position.set(
					Math.random() * (mapSize - 2) - halfMapSize,
					1.5, // Altura inicial mais alta
					Math.random() * (mapSize - 2) - halfMapSize,
				);

				scene.add(heart);
				hearts.push(heart);
			});
		}

		// Criar corações iniciais
		for (let i = 0; i < 5; i++) {
			createHeart();
		}

		// Função para fazer os corações flutuarem
		function animateHearts() {
			hearts.forEach((heart) => {
				// Fazemos o coração flutuar mais alto
				heart.position.y =
					1.5 + Math.sin(Date.now() * 0.002 + heart.position.x) * 0.2;

				// Adicionamos uma rotação suave
				heart.rotation.y += 0.01;
			});
		}

		// Movimento do jogador
		const velocity = new THREE.Vector3();
		const direction = new THREE.Vector3();
		let moveForward = false;
		let moveBackward = false;
		let moveLeft = false;
		let moveRight = false;

		const onKeyDown = (event: KeyboardEvent) => {
			switch (event.code) {
				case "ArrowUp":
				case "KeyW":
					moveForward = true;
					break;
				case "ArrowLeft":
				case "KeyA":
					moveLeft = true;
					break;
				case "ArrowDown":
				case "KeyS":
					moveBackward = true;
					break;
				case "ArrowRight":
				case "KeyD":
					moveRight = true;
					break;
			}
		};

		const onKeyUp = (event: KeyboardEvent) => {
			switch (event.code) {
				case "ArrowUp":
				case "KeyW":
					moveForward = false;
					break;
				case "ArrowLeft":
				case "KeyA":
					moveLeft = false;
					break;
				case "ArrowDown":
				case "KeyS":
					moveBackward = false;
					break;
				case "ArrowRight":
				case "KeyD":
					moveRight = false;
					break;
			}
		};

		document.addEventListener("keydown", onKeyDown);
		document.addEventListener("keyup", onKeyUp);

		// Tiro
		const raycaster = new THREE.Raycaster();
		const onMouseClick = () => {
			if (!controls.isLocked) {
				controls.lock();
			} else if (!gameOver && !gameWon) {
				raycaster.setFromCamera(new THREE.Vector2(), camera);
				const intersects = raycaster.intersectObjects(zombies);
				if (intersects.length > 0) {
					const hitZombie = intersects[0].object as THREE.Mesh;
					scene.remove(hitZombie);
					zombies.splice(zombies.indexOf(hitZombie), 1);
					setScore((prevScore) => {
						const newScore = prevScore + 1;
						if (newScore === waveConfig[currentWave - 1].zombieCount) {
							const nextWave = currentWave + 1;
							setCurrentWave(nextWave);
							startNewWave(nextWave);
						} else {
							createZombie();
						}
						return newScore;
					});
				}
			}
		};

		document.addEventListener("click", onMouseClick);

		// Movimento dos zumbis
		function moveZombies(delta: number) {
			const playerPosition = controls.getObject().position;
			zombies.forEach((zombie) => {
				const direction = new THREE.Vector3()
					.subVectors(playerPosition, zombie.position)
					.normalize();

				// Usar a velocidade individual do zumbi
				const speed = (zombie as any).speed;
				(zombie as any).velocity.x = direction.x * speed * delta;
				(zombie as any).velocity.z = direction.z * speed * delta;

				zombie.position.x += (zombie as any).velocity.x;
				zombie.position.z += (zombie as any).velocity.z;

				// Fazer o zumbi olhar para o jogador
				zombie.lookAt(playerPosition);
			});
		}

		// Colisão com zumbis
		function checkZombieCollision() {
			const playerPosition = controls.getObject().position;
			zombies.forEach((zombie) => {
				const distance = playerPosition.distanceTo(zombie.position);
				if (distance < 1.5) {
					// Ajuste este valor para a distância de colisão desejada
					setHealth((prevHealth) => {
						if (prevHealth > 1) {
							scene.remove(zombie);
							zombies.splice(zombies.indexOf(zombie), 1);
							createZombie();
							return prevHealth - 1;
						} else {
							setGameOver(true);
							return 0;
						}
					});
				}
			});
		}

		// Colisão com corações
		function checkHeartCollision() {
			const playerPosition = controls.getObject().position;
			hearts.forEach((heart, index) => {
				const distance = playerPosition.distanceTo(heart.position);
				if (distance < 1) {
					setHealth((prevHealth) => Math.min(prevHealth + 1, 3));
					scene.remove(heart);
					hearts.splice(index, 1);
					// Não criamos um novo coração imediatamente, deixamos a função createHeart ser chamada periodicamente
				}
			});
		}

		// Adicione esta função para verificar e criar novos zumbis se necessário
		function checkZombieCount() {
			const currentWaveZombieCount = waveConfig[currentWave - 1].zombieCount;
			const remainingZombies = currentWaveZombieCount - score;
			const zombiesToCreate = Math.min(
				maxZombiesOnScreen - zombies.length,
				remainingZombies,
			);

			for (let i = 0; i < zombiesToCreate; i++) {
				createZombie();
			}
		}

		// Adicione esta função para criar corações periodicamente
		function checkHeartCount() {
			if (hearts.length < maxHearts) {
				createHeart();
			}
		}

		// Animação
		const animate = () => {
			requestAnimationFrame(animate);

			if (controls.isLocked && !gameOver && !gameWon) {
				const delta = 0.1;

				velocity.x -= velocity.x * 10.0 * delta;
				velocity.z -= velocity.z * 10.0 * delta;

				direction.z = Number(moveForward) - Number(moveBackward);
				direction.x = Number(moveRight) - Number(moveLeft);
				direction.normalize();

				if (moveForward || moveBackward)
					velocity.z -= direction.z * 5.0 * delta;
				if (moveLeft || moveRight) velocity.x -= direction.x * 5.0 * delta;

				controls.moveRight(-velocity.x * delta);
				controls.moveForward(-velocity.z * delta);

				// Limitar o movimento do jogador dentro das paredes
				const playerPosition = controls.getObject().position;
				playerPosition.x = Math.max(
					-mapSize / 2 + 1,
					Math.min(mapSize / 2 - 1, playerPosition.x),
				);
				playerPosition.z = Math.max(
					-mapSize / 2 + 1,
					Math.min(mapSize / 2 - 1, playerPosition.z),
				);

				moveZombies(delta);
				checkZombieCollision();
				animateHearts();
				checkHeartCollision();
				checkZombieCount(); // Adicione esta linha
				checkHeartCount(); // Adicione esta linha para verificar e criar corações periodicamente
			}

			renderer.render(scene, camera);
		};

		animate();

		// Redimensionamento da janela
		const handleResize = () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		};

		window.addEventListener("resize", handleResize);

		// Limpeza
		return () => {
			window.removeEventListener("resize", handleResize);
			document.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("keyup", onKeyUp);
			document.removeEventListener("click", onMouseClick);
			mountRef.current?.removeChild(renderer.domElement);
			zombies.forEach((zombie) => scene.remove(zombie));
			hearts.forEach((heart) => scene.remove(heart));
		};
	}, [gameOver, currentWave, gameWon]);

	return (
		<div ref={mountRef} className="game-container">
			<div className="crosshair"></div>
			<div className="hud">
				<div className="health">
					{[...Array(health)].map((_, i) => (
						<span key={i} className="heart">
							❤️
						</span>
					))}
				</div>
				<div className="score">Pontuação: {score}</div>
				<div className="wave">Wave: {currentWave}</div>
			</div>
			{waveMessage && <div className="wave-message">{waveMessage}</div>}
			{!gameOver && !gameWon && (
				<div className="instructions">
					Clique para iniciar. Use WASD ou setas para mover. Clique para atirar.
				</div>
			)}
			{gameOver && (
				<div className="game-over">
					Fim de jogo! Sua pontuação final: {score}
					<button onClick={() => window.location.reload()}>
						Jogar novamente
					</button>
				</div>
			)}
			{gameWon && (
				<div className="game-won">
					Parabéns! Você venceu o jogo! Pontuação final: {score}
					<button onClick={() => window.location.reload()}>
						Jogar novamente
					</button>
				</div>
			)}
		</div>
	);
}

export default App;
