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
		renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Sombras mais suaves
		mountRef.current.appendChild(renderer.domElement);

		// Iluminação
		const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
		scene.add(ambientLight);

		// Sol (luz direcional)
		const sunLight = new THREE.DirectionalLight(0xffffff, 1);
		sunLight.position.set(50, 50, 50);
		sunLight.castShadow = true;
		sunLight.shadow.mapSize.width = 2048;
		sunLight.shadow.mapSize.height = 2048;
		sunLight.shadow.camera.near = 1;
		sunLight.shadow.camera.far = 200;
		sunLight.shadow.camera.left = -50;
		sunLight.shadow.camera.right = 50;
		sunLight.shadow.camera.top = 50;
		sunLight.shadow.camera.bottom = -50;
		scene.add(sunLight);

		// Ajuste o renderer para usar sombras de alta qualidade
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		// Controles de câmera
		const controls = new PointerLockControls(camera, renderer.domElement);
		controls.getObject().position.set(0, 1.7, 0); // Posiciona a câmera na altura dos olhos
		scene.add(controls.getObject());

		// Tamanho do mapa
		const mapSize = 80;

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

		// Zumbis (alvos GLTF)
		const zombies: THREE.Group[] = [];
		const loader = new GLTFLoader();

		const waveConfig = [
			{ zombieCount: 5, speed: 0.05 },
			{ zombieCount: 15, speed: 0.1 },
			{ zombieCount: 5, speed: 0.4 },
			{ zombieCount: 5, speed: 0.5 },
			{ zombieCount: 5, speed: 2.0 },
		];
		const maxZombiesOnScreen = 10;

		function createZombie() {
			if (zombies.length >= maxZombiesOnScreen) return;

			loader.load("/shooting_range_target/scene.gltf", (gltf) => {
				const zombie = gltf.scene;
				zombie.scale.set(0.5, 0.5, 0.5); // Ajuste a escala conforme necessário
				zombie.position.set(
					Math.random() * (mapSize - 4) - (mapSize / 2 - 2),
					0, // Coloque os alvos no chão
					Math.random() * (mapSize - 4) - (mapSize / 2 - 2),
				);
				zombie.traverse((child) => {
					if (child instanceof THREE.Mesh) {
						child.castShadow = true;
						child.receiveShadow = true;
					}
				});
				(zombie as any).velocity = new THREE.Vector3();
				(zombie as any).speed = waveConfig[currentWave - 1].speed;
				scene.add(zombie);
				zombies.push(zombie);
			});
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
		for (let i = 0; i < 2; i++) {
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

		// Adicione esta linha no início do useEffect
		const audioLoader = new THREE.AudioLoader();
		const listener = new THREE.AudioListener();
		camera.add(listener);
		const gunSound = new THREE.Audio(listener);

		audioLoader.load("/pistol-shot.mp3", (buffer) => {
			gunSound.setBuffer(buffer);
			gunSound.setVolume(0.5);
		});

		// Adicione estas variáveis para controlar o cooldown da arma
		let lastShotTime = 0;
		const shootCooldown = 400; // 0.4 segundos em milissegundos

		// Tiro
		const raycaster = new THREE.Raycaster();
		const onMouseClick = () => {
			if (!controls.isLocked) {
				controls.lock();
			} else if (!gameOver && !gameWon) {
				const currentTime = Date.now();
				if (currentTime - lastShotTime >= shootCooldown) {
					// Toque o som do tiro
					if (gunSound.isPlaying) {
						gunSound.stop();
					}
					gunSound.play();

					// Atualize o tempo do último tiro
					lastShotTime = currentTime;

					raycaster.setFromCamera(new THREE.Vector2(), camera);
					const intersects = raycaster.intersectObjects(scene.children, true);
					if (intersects.length > 0) {
						const hitObject = intersects[0].object;
						const hitZombie = zombies.find((zombie) =>
							zombie.getObjectById(hitObject.id),
						);
						if (hitZombie) {
							// Remova o alvo da cena e da lista
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
				}
				// Se o cooldown não passou, não faz nada (ignora o clique)
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

				const speed = (zombie as any).speed;
				(zombie as any).velocity.x = direction.x * speed * delta;
				(zombie as any).velocity.z = direction.z * speed * delta;

				zombie.position.x += (zombie as any).velocity.x;
				zombie.position.z += (zombie as any).velocity.z;
				zombie.position.y = 0; // Mantenha os alvos no chão

				zombie.lookAt(playerPosition.x, 0, playerPosition.z);
			});
		}

		// Colisão com zumbis
		function checkZombieCollision() {
			const playerPosition = controls.getObject().position;
			const playerBoundingBox = new THREE.Box3().setFromCenterAndSize(
				playerPosition,
				new THREE.Vector3(1, 3, 1), // Ajuste esses valores conforme necessário
			);

			zombies.forEach((zombie, index) => {
				const zombieBoundingBox = new THREE.Box3().setFromObject(zombie);

				if (playerBoundingBox.intersectsBox(zombieBoundingBox)) {
					setHealth((prevHealth) => {
						if (prevHealth > 1) {
							scene.remove(zombie);
							zombies.splice(index, 1);
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
			camera.remove(listener);
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
				<div className="score">Pontuação: {score}</div>z
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
				<div className="game-won flex flex-col">
					Parabéns! Você venceu o jogo! Pontuação final: {score}
					<button onClick={() => window.location.reload()} className="ml-12">
						Jogar novamente
					</button>
				</div>
			)}
		</div>
	);
}

export default App;
